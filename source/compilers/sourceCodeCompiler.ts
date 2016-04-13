import * as ts from "typescript";
import * as _ from "underscore";
import {RuntimeControllerMetadataCompiler} from "./runtimeCompiler";
import {Logger} from "bunyan";
import {ApiControllerVisitor} from "../shared";
import {TypeKind,IApi,IApiType,IApiRequest,IRouteBuilder,IApiNamedType,IApiController,IApiVoidRequest,IApiRequestHandler,IApiControllerClass,IApiControllerRoute,IApiControllerCompiler,IApiControllerRouteVerb,IApiControllerRouteTypes,IApiControllerClassConstructor} from "../core";
type SimpleTypes = "any" | "string" | "boolean" | "void" | "number";

export class SourceCodeControllerMetadataCompiler extends RuntimeControllerMetadataCompiler {
  private sourceCode: ISourceCode;
  private foundRefSymbols: string[];
  private failedRefSymbols: string[];
  private foundRefTypes: IApiType[];

  constructor(logger: Logger, sourceFiles: string[], controllerConstructor?: IApiControllerClassConstructor) {
    super(logger, controllerConstructor)
    this.sourceCode = this.getSourceCode(sourceFiles);
  }

  protected reset(){
    super.reset();
    this.foundRefSymbols = [];
    this.foundRefTypes = [];
    this.failedRefSymbols = [];
  }

  protected postCompile(api: IApi) {
    api.referenceTypes = this.foundRefTypes;
  }

  protected postApiControllerRoute(controllerName: string, route: IApiControllerRoute){
    var node = this.findMemberNode(controllerName, route);
    if (node) {
      this.createApiControllerRoute(route, node);
    } else {
      this.onError(`Unable to find Source Node for Controller '${controllerName}' - method '${route.memberName}'`)
    }
  }

  protected isKnownUndefinedType(name: string) {
    return name === "IApiRequest" || name === "IApiVoidRequest";
  }

  protected getApiControllerRouteTypes(type: IApiType): IApiControllerRouteTypes {
    switch(type.name){
      case "IApiRequest":
        return {
          request: type.args[0],
          response: type.args[1],
          params: type.args[2],
          queryString: type.args[3]
        }
      case "IApiVoidRequest":
        return {
          request: this.voidApiType(),
          response: type.args[0],
          params: type.args[1],
          queryString: type.args[2]
        }
      default:
        return;
    }
  }

  private getControllerNameFromDecorator(nd: ts.Node) {
    if (nd && nd.decorators) {
      var names = nd.decorators.map(d => {
        const name = d.expression["expression"].text
        if (name !== "controller") {
          return;
        }
        const args = d.expression["arguments"];
        if (args && args.length > 0) {
          return args[0].text;
        }
      });
      return _.find(names, n => !!n);
    }
  }

  private findMemberNode(controllerName: string, r: IApiControllerRoute) {
    var d = _.find(this.sourceCode.declarations, d => d.name === r.memberName);
    if (d) {
      if (d.nodes.length === 1) {
        return d.nodes[0];
      }

      return _.find(d.nodes, n => this.getControllerNameFromDecorator(n.parent) === controllerName)
    }
  }

  private createApiControllerRouteFromMethod(r: IApiControllerRoute, n: ts.MethodDeclaration): IApiNamedType {
    if (n.parameters.length !== 1) {
      this.logger.trace(`Ignoring Route From Method (Incorrect number of parameters): ${n.name.getText()}`)
      return;
    }
    var type = this.nodeToApiType(n.parameters[0].type)
    r.types = this.getApiControllerRouteTypes(type);
    if (!r.types) {
      this.onError(`Unknown Controller Action Parameter Type ${type.name}`)
    }
    return { type, name: r.memberName }
  }

  private createApiControllerRouteFromPropertyArrowFunction(r: IApiControllerRoute, n: ts.PropertyDeclaration): IApiNamedType {
    if (!n.initializer) {
      this.logger.trace(`Ignoring Route From Property (Missing initializer): ${n.name.getText()}`)
      return;
    }
    var init = n.initializer as ts.ArrowFunction;
    if (!init.parameters || init.parameters.length !== 1) {
      this.logger.trace(`Ignoring Route From Property (Incorrect number of parameters): ${n.name.getText()}`)
      return;
    }

    var type = this.nodeToApiType(init.parameters[0].type);
    r.types = this.getApiControllerRouteTypes(type);
    if (!r.types) {
      this.onError(`Unknown Controller Action Parameter Type ${type.name}`)
    }
    return { type, name: r.memberName }
  }

  private createApiControllerRoute(r: IApiControllerRoute, n: ts.Node): IApiNamedType {
    switch (n.kind) {
      case ts.SyntaxKind.PropertyDeclaration:
        return this.createApiControllerRouteFromPropertyArrowFunction(r, n as ts.PropertyDeclaration);
      case ts.SyntaxKind.MethodDeclaration:
        return this.createApiControllerRouteFromMethod(r, n as ts.MethodDeclaration);
    }
  }

  private getEnum(cd: ts.EnumDeclaration, withMembers = false): IApiType {
    var d = { name: cd.name.getText(), kind: withMembers ? TypeKind.Enum : TypeKind.EnumRef } as IApiType;
    if (withMembers) {
      //d.code = cd.getText()
      let index = -1;
      d.members = cd.members.map(m => {
        if (m.initializer) {
          index = parseInt(m.initializer.getText());
        } else {
          index++;
        }
        return { name: m.name.getText(), value: index } as IApiNamedType
      });
    }
    return d;
  }

  private getInterface(id: ts.InterfaceDeclaration, withMembers = false): IApiType {
    var t = { name: id.name.getText(), kind: withMembers ? TypeKind.Interface : TypeKind.InterfaceRef } as IApiType;
    if (id.typeParameters) {
      t.args = id.typeParameters.map(tp => {
        return { name: tp.name.text, kind: TypeKind.TypeArg } as IApiType;
      })
    }
    if (withMembers) {
      let index = -1;
      t.members = id.members.map(p => {
        const memberName = p.name.getText();
        if (p.kind === ts.SyntaxKind.MethodSignature) {
          this.logger.trace(`Ignoring Method Signature: ${t.name} - ${memberName}`)
          return;
        }
        if (p.kind === ts.SyntaxKind.PropertySignature) {
          const dec = p as ts.PropertySignature;
          if (dec.type.kind === ts.SyntaxKind.FunctionType) {
            this.logger.trace(`Ignoring Function type: ${t.name} - ${memberName}`)
            return;
          }
          const apt = { name: memberName, type: this.nodeToApiType(dec.type) } as IApiNamedType;
          if (dec.questionToken) {
            apt.optional = true;
          }
          return apt
        }

        this.onError(`Unknown Member Syntax Kind '${p.kind}' on Interface type: ${t.name} - ${memberName}`)
      }).filter(m => !!m);

      if (id.heritageClauses) {
        id.heritageClauses.forEach(hc => {
          if (!hc.types) {
            this.logger.trace(`no types found in heritageClauses - ${t.name}`)
            return;
          }
          t.extends = hc.types.map(hct => {
            var id = hct.expression as ts.Identifier;
            var nodes = _.find(this.sourceCode.declarations, d => d.name === id.text);
            if (nodes && nodes.nodes.length > 0) {
              var node = nodes.nodes[0];
              var it = this.getInterface(node as ts.InterfaceDeclaration, true);
              this.collectRefTypes(it.name, () => it);
              var apiT = {name: it.name, kind: TypeKind.InterfaceRef } as IApiType
              if (hct.typeArguments) {
                apiT.args = hct.typeArguments.map(t => this.nodeToApiType(t));
              }
              return apiT;
            }
          }).filter(t => !!t)
        })
      }
    }
    return t
  }

  private arrayNodeToApiType(typeNode: ts.ArrayTypeNode): IApiType {
    const type = this.nodeToApiType(typeNode.elementType);
    type.isArray = true;
    return type;
  }

  private anonNodeToApiType(typeNode: ts.TypeLiteralNode): IApiType {
    const tl = typeNode as ts.TypeLiteralNode;
    const apiType: IApiType = { kind: TypeKind.Anonymous }
    //apiType.code = typeNode.getText()
    apiType.members = tl.members.map(k => {
      const ps = k as ts.PropertySignature;
      const a = {
        name: k.name.getText(),
        type: this.nodeToApiType(ps.type)
      } as IApiNamedType;
      if (ps.questionToken) {
        a.optional = true;
      }
      return a;
    });
    return apiType;
  }

  private refNodeToApiType(typeNode: ts.TypeReferenceNode): IApiType {
    const name = typeNode.typeName.getText();
    let apiType: IApiType = { name, kind: TypeKind.Unknown }
    if (!this.isKnownUndefinedType(name)) {
      var dec = _.find(this.sourceCode.declarations, d => d.name === name);
      if (dec) {
        if (dec.nodes.length === 1) {
          const node = dec.nodes[0];
          switch (node.kind) {
            case ts.SyntaxKind.TypeAliasDeclaration:
              apiType = this.nodeToApiType((node as ts.TypeAliasDeclaration).type);
              apiType.name = name;
              break;
            case ts.SyntaxKind.InterfaceDeclaration:
              apiType = this.getInterface(node as ts.InterfaceDeclaration)
              this.collectRefTypes(name, () => this.getInterface(node as ts.InterfaceDeclaration, true))
              break;
            case ts.SyntaxKind.EnumDeclaration:
              apiType = this.getEnum(node as ts.EnumDeclaration);
              this.collectRefTypes(name, () => this.getEnum(node as ts.EnumDeclaration, true))
              break;
            default:
              this.onError(`Unknown kind for Type Reference: ${node.kind} - ${name}`)
              break;
          }
        } else {
          this.onError(`Multiple declarations found for Type Reference name: ${name}`)
        }
      } else {
        const type = this.sourceCode.typeChecker.getTypeAtLocation(typeNode);
        if ((type.flags & ts.TypeFlags.TypeParameter) === ts.TypeFlags.TypeParameter) {
          apiType.kind = TypeKind.TypeParam;
        } else{
          if (this.failedRefSymbols.indexOf(name) === -1) {
            this.onError(`Declaration not found for Type Reference name: ${name}`);
            this.failedRefSymbols.push(name);
          }
        }
      }
    }

    if (typeNode.typeArguments) {
      apiType.args = typeNode.typeArguments.map(t => this.nodeToApiType(t));
    }

    return apiType;
  }

  private collectRefTypes(name: string, getter: () => IApiType) {
    if (this.foundRefSymbols.indexOf(name) === -1) {
      this.foundRefTypes.push(getter())
      this.foundRefSymbols.push(name)
    }
  }

  protected voidApiType(): IApiType {
    return this.simpleNodeToApiType("void");
  }

  private simpleNodeToApiType(name: SimpleTypes): IApiType {
    return { name, kind: TypeKind.Simple };
  }

  private uoiNodeToApiType(typeNode: ts.UnionOrIntersectionTypeNode, union: boolean): IApiType {
    return { kind: union ? TypeKind.Union : TypeKind.Intersection, subTypes: typeNode.types.map(t => this.nodeToApiType(t)) };
  }

  private nodeToApiType(typeNode: ts.TypeNode): IApiType {
    switch (typeNode.kind) {
      case ts.SyntaxKind.ArrayType:
        return this.arrayNodeToApiType(typeNode as ts.ArrayTypeNode)
      case ts.SyntaxKind.AnyKeyword:
        return this.simpleNodeToApiType("any");
      case ts.SyntaxKind.StringKeyword:
        return this.simpleNodeToApiType("string");
      case ts.SyntaxKind.BooleanKeyword:
        return this.simpleNodeToApiType("boolean");
      case ts.SyntaxKind.VoidKeyword:
        return this.voidApiType();
      case ts.SyntaxKind.NumberKeyword:
        return this.simpleNodeToApiType("number");
      case ts.SyntaxKind.TypeReference:
        return this.refNodeToApiType(typeNode as ts.TypeReferenceNode);
      case ts.SyntaxKind.UnionType:
        return this.uoiNodeToApiType(typeNode as ts.UnionTypeNode, true);
      case ts.SyntaxKind.IntersectionType:
        return this.uoiNodeToApiType(typeNode as ts.IntersectionTypeNode, false);
      case ts.SyntaxKind.TypeLiteral:
        return this.anonNodeToApiType(typeNode as ts.TypeLiteralNode);
      default:
        this.onError(`Unknown SyntaxKind encountered: ${typeNode.kind}`)
        return { kind: TypeKind.Unknown };
    }
  }
  private getSourceCode(sourceFiles: string[]): ISourceCode {
    const options: any = {};
    const host = ts.createCompilerHost(options);
    const program = ts.createProgram(sourceFiles, options, host);
    var typeChecker = program.getTypeChecker();
    var declarations: { nodes: ts.Node[], name: string }[] = [];
    for (var i = 0; i < sourceFiles.length; i++) {
      const sf = program.getSourceFile(sourceFiles[i]);
      if (!sf) {
        this.onError(`Invalid Source Path: ${sourceFiles[i]}`)
        continue;
      }
      var decs: any[] = sf["getNamedDeclarations"]();
      declarations.push(..._.flatten(_.keys(decs).map(k => {
        return { nodes: decs[k], name: k };
      })));
    }

    return { typeChecker, declarations }
  }
}

interface ISourceCode {
  typeChecker: ts.TypeChecker;
  declarations: { nodes: ts.Node[], name: string }[];
}
