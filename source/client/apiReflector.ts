import * as ts from "typescript";
import * as _ from "underscore";
import * as fs from "fs";
import {Logger} from "bunyan";

export interface ITypeReg {
  name: string
  type: ts.Type
  node: ts.Node
}

interface ITypeRegDictionary {
  [id: string]: ITypeReg;
}
export class ApiReflector {
  private program: ts.Program
  private checker: ts.TypeChecker
  constructor(private logger: Logger, sourcePaths: string[]) {
    const options: ts.CompilerOptions = {};
    const host = ts.createCompilerHost(options);
    this.program = ts.createProgram(sourcePaths, options, host);
    this.checker = this.program.getTypeChecker();
  }

  reflect() {
    const types: ITypeRegDictionary = {}
    this.program.getSourceFiles().forEach(sourceFile => {
      this.logger.trace("READING: ", sourceFile.path)
      this.collectTypes(sourceFile as any, types)
    })

    const allTypes = _.values(types);
    const included = allTypes.filter(t => {
      const items = ApiReflector.getApiAttr(t.node.decorators, "controller");
      return items && items.length > 0
    })

    const foundRegs: ITypeReg[] = []
    included.forEach(i => {
      const cls = i.node as ts.ClassDeclaration
      const routes = cls.members.filter(m => {
        const items = ApiReflector.getApiAttr(m.decorators, "route");
        return items && items.length > 0
      })

      routes.forEach(r => {
        const method = r as ts.MethodDeclaration
        const param = method.parameters[0]
        this.processTypeNode(param.type, foundRegs, types)
      })
    })

    return { api: included, dependencies: foundRegs }
  }

  private findSymbolNode(symb: ts.Symbol, types: ITypeRegDictionary) {
    return _.find(_.values(types), t => t.type.symbol === symb)
    // if (!found) {
    //   //this.logger.trace(`TypeRegistry: Cannot FIND Symbol ${ts.SyntaxKind[symb.name]}`)
    //   return
    // }
    // return found
  }

  private findTypeNode(node: ts.TypeNode, types: ITypeRegDictionary) {
    const type = this.checker.getTypeAtLocation(node)
    const found = types[type["id"]]
    if (!found) {
      //this.logger.trace(`TypeRegistry: Cannot FIND ${ts.SyntaxKind[node.kind]}`)
      return
    }
    return found
  }

  private collectTypes(node: ts.TypeNode, types: ITypeRegDictionary) {
    if (this.isKeywordType(node.kind)) {
      return false;
    }

    this.nodeRecurser(node, n => {
      if (n.kind === ts.SyntaxKind.ArrayType) {
        const atn = n as ts.ArrayTypeNode
        n = atn.elementType
      }
      const isType =
        //n.kind === ts.SyntaxKind.TypeLiteral ||
        n.kind === ts.SyntaxKind.EnumDeclaration ||
        n.kind === ts.SyntaxKind.TypeAliasDeclaration ||
        n.kind === ts.SyntaxKind.ClassDeclaration ||
        n.kind === ts.SyntaxKind.InterfaceDeclaration
      if (isType) {
        const t = this.checker.getTypeAtLocation(n)
        types[t["id"]] = {
          name: t.symbol ? t.symbol.name : n.getText(),//"[ANON]"),
          //code: this.checker.typeToString(t),
          type: t,
          node: n
        }
        return false
      }

      return true // recurse this node
    })
  }

  private nodeRecurser(node: ts.Node, shouldRecurseChildren: (n: ts.Node) => boolean) {
    if (shouldRecurseChildren(node)) {
      ts.forEachChild(node, n => this.nodeRecurser(n, shouldRecurseChildren))
    }
  }

  private visitedNodes: number[] = []
  private processNodes(r: ITypeReg, foundRegs: ITypeReg[], types: ITypeRegDictionary) {
    if (this.visitedNodes.indexOf(r.type["id"]) > -1) {
      return;
    }
    this.visitedNodes.push(r.type["id"])

    //r.node.kind
    const inter = r.node as ts.InterfaceDeclaration
    inter.members && inter.members.forEach(m => {
      if (m.kind === ts.SyntaxKind.EnumMember) {
        return;
      }

      const ms = m as ts.PropertySignature;
      if (ms.type && this.processTypeNode(ms.type, foundRegs, types)) {
        return;
      }

      this.logger.warn(`Unknown member type: ${ts.SyntaxKind[m.kind]}`)
    })

    const symbl = r.type.symbol;
    if (!symbl) {
      //let extra = ""
      if (r.node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
        const ta = r.node as ts.TypeAliasDeclaration
        if (this.processTypeNode(ta.type, foundRegs, types)) {
          return;
        }

        this.logger.warn(`Unknown TypeAliasDeclaration type`)
        //extra = ts.SyntaxKind[ta.type.kind] ;// ta.typeParameters ? ta.typeParameters.map(tp => tp.constraint.kind).join(",") : "NONE"
        return
      }

      this.logger.warn(`Unknown type without symbol: ${ts.SyntaxKind[r.node.kind]}`)
      return
    }

    const out = this.getBaseSymbols(r.type, types) // || "[NULL]"
    out.forEach(o => {
      this.processNodes(o, foundRegs, types)
    })
    this.addUnique(out, foundRegs)
  }

  private isKeywordType(kind: ts.SyntaxKind) {
    return ts.SyntaxKind[kind].indexOf("Keyword") > -1
  }

  private processTypeNode(typeNode: ts.TypeNode, foundRegs: ITypeReg[], types: ITypeRegDictionary): boolean {
    if (this.isKeywordType(typeNode.kind)) {
      return true;
    }
    const targs = typeNode["typeArguments"];
    targs && targs.forEach(t => {
      this.processTypeNode(t, foundRegs, types);
    })
    if (typeNode.kind === ts.SyntaxKind.LastTypeNode) {
      return true;
    }
    if (typeNode.kind === ts.SyntaxKind.ArrayType) {
      const tt = typeNode as ts.ArrayTypeNode
      return this.processTypeNode(tt.elementType, foundRegs, types)
    }

    if (typeNode.kind === ts.SyntaxKind.UnionType || typeNode.kind === ts.SyntaxKind.IntersectionType) {
      const ut = typeNode as ts.UnionOrIntersectionTypeNode;
      ut.types.forEach(id => {
        this.processTypeNode(id, foundRegs, types)
      })
      return true
    }

    const tlt = typeNode as ts.TypeLiteralNode
    tlt.members && tlt.members.forEach(mem => {
      const propSig = mem as ts.PropertySignature;
      if (propSig.type) {
        this.processTypeNode(propSig.type, foundRegs, types)
      } else {
        this.logger.warn(`Unknown type member symbol: ${ts.SyntaxKind[mem.kind]}`)
      }
    })
    if (typeNode.kind === ts.SyntaxKind.TypeLiteral) {
      return true;
    }

    const nn = this.findTypeNode(typeNode, types);
    if (nn) {
      this.processNodes(nn, foundRegs, types)
      this.addUnique([nn], foundRegs)
      return true;
    } else {
      this.logger.warn(`Cannot find type registry entry for: ${ts.SyntaxKind[typeNode.kind]} - ${typeNode.getText()}`)
      return false;
    }
  }

  private addUnique<T>(add: T[], collect: T[]) {
    add.forEach(o => {
      if (collect.indexOf(o) === -1) {
        collect.push(o)
      }
    })
  }

  private getBaseSymbols(type: ts.Type, types: ITypeRegDictionary): ITypeReg[] {
    const bt = type.getBaseTypes();
    const tt = bt ? bt.map(t => {
      return this.findSymbolNode(t.symbol, types)
    }) : []
    const dd: ITypeReg[] = _.flatten(tt.map(t => this.getBaseSymbols(t.type, types)));
    return tt.concat(dd);
  }

  static getApiAttr(decorators: ts.Decorator[], name: string) {
    if (!decorators || !decorators.length) {
      return
    }
    return decorators.filter(d => this.isApiAttr(d, name))
  }

  private static isApiAttr(decorator: ts.Decorator, name: string) {
    try {
      return this.decoratorProperty(decorator).name.text === name
    } catch (e) {
      return false
    }
  }
  private static decoratorProperty(decorator: ts.Decorator) {
    return (decorator.expression as ts.CallExpression).expression as ts.PropertyAccessExpression
  }
}
