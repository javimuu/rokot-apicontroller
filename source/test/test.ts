import {expect,sinon,supertest,chai} from "rokot-test";
import {ExpressRouteBuilder} from "../expressRouteBuilder";
import {RuntimeControllerMetadataCompiler} from "../compilers/runtimeCompiler";
import {SourceCodeControllerMetadataCompiler} from "../compilers/sourceCodeCompiler";
import * as _ from "underscore";
import "./example/controllers";
import "./example/middleware";
import * as fs from "fs";
import {ConsoleLogger,Logger} from "rokot-log";
import {ApiControllerExplorer,ApiControllerVisitor} from "../shared";
import {RouteBuilder,MiddlewareProvider} from "../routeBuilder";
import {IApiControllerCompiler,IApiControllerRoute, IApiRequestHandler, IApiControllerClassConstructor, IApiControllerRouteVerb, IApiType, TypeKind, IApiController, IApi} from "../core";

function compile(name: string, compiler: IApiControllerCompiler, debug = false) {
  const compiled = compiler.compile();
  if (debug) {
    fs.writeFileSync(name, JSON.stringify(compiled, null, 2))
  }
  //compiler.logger.getLogs(debug ? LogLevel.Warn : LogLevel.Warn).forEach(l => console.log(l));
  return compiled;
}

export class TestRouteBuilder extends RouteBuilder {
  routes: IApiControllerRoute[] = []
  routeRequests: IApiControllerRoute[] = []
  constructor(logger: Logger, controllerConstructor?: IApiControllerClassConstructor) {
    super(logger, controllerConstructor)
  }

  protected createRequestHandler(route: IApiControllerRoute, routeHandler:IApiRequestHandler<any, any, any, any>) : Function {
    this.routeRequests.push(route);
    this.logger.trace(`Creating Request Handler ${route.name}`)
    return () => {
      this.logger.trace(`Invoking ${route.name}`)
      routeHandler(null);
    }
  }

  protected setupRoute(route: IApiControllerRoute, routeVerb: IApiControllerRouteVerb, requestHandlers: Function[]){
    this.routes.push(route);
    this.logger.trace(`Setup of ${route.name} ${routeVerb.verb}: ${routeVerb.route}`)
  }
}

class Helper{
  static compareArrayValues<T, TValue>(descriptionLeft: string, left: T[], descriptionRight: string, right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
    Helper.compareArrays(descriptionRight, right, left, compareValue)
    Helper.compareArrays(descriptionLeft, left, right, compareValue, compareValues)
  }

  static compareArrays<T, TValue>(description: string, left: T[], right: T[], compareValue: (t: T) => TValue, compareValues?: (l: T, r: T, compare: TValue) => void){
    if (left === right) {
      return;
    }

    right.forEach(lm => {
      const compare = compareValue(lm);
      const rm = _.find(left, m => compareValue(m) === compare)
      expect(rm).to.not.eq(undefined, `${description} missing ${compare}`);
      if (compareValues) {
        compareValues(lm, rm, compare)
      }
    })
  }
}

function getRefTypes(items: IApiType[]) {
  return items.filter(i => i.kind === TypeKind.InterfaceRef || i.kind === TypeKind.EnumRef)
}

function isEnumInterfaceTypes(item: IApiType) {
  return item.kind === TypeKind.Interface || item.kind === TypeKind.Enum;
}

function getEnumInterfaceTypes(items: IApiType[]) {
  return items.filter(i => isEnumInterfaceTypes(i))
}

function isEnumRef(type: IApiType, compare: IApiType){
  return type.kind === TypeKind.EnumRef && compare.kind === TypeKind.Enum;
}

function isInterfaceRef(type: IApiType, compare: IApiType){
  return type.kind === TypeKind.InterfaceRef && compare.kind === TypeKind.Interface;
}

function matchType(items: IApiType[], type: IApiType) {
  return _.find(items, t => t.name === type.name && (t.kind === type.kind || isInterfaceRef(type, t) || isEnumRef(type, t)))
}

function collectTypes(controllers: IApiController[]) {
  const types = ApiControllerExplorer.gatherRouteTypes(controllers);
  return ApiControllerExplorer.gatherTypes(types);
}

describe("Middleware Provider test", () => {
  it("should find all routes middleware", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    var api = compile("out/reflected.json", reflectCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)

    var mw = new MiddlewareProvider(logger)
    var middleware = mw.get(api.controllers);
    expect(_.keys(middleware).length).to.greaterThan(0, `Should have metadata`)
    for (var key in middleware) {
      expect(_.isFunction(middleware[key])).to.be.true;
    }
  });
})

describe("Route Builder test", () => {
  it("should build routes from the Api", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    var api = compile("out/reflected.json", reflectCompiler)
    var builder = new TestRouteBuilder(logger);
    var ok = builder.build(api);
    expect(ok).to.be.true;
    var rC = 0;
    var rvC = 0;
    ApiControllerExplorer.forEachControllerRoute(api.controllers, (c,r) =>{
      rC += 1;
      rvC += r.routeVerbs.length;
    })
    expect(builder.routes.length).to.be.eq(rvC, "Should have one route per controller route verb")
    expect(builder.routeRequests.length).to.be.eq(rC, "Should have one routeRequests per controller route")
  });
})

describe("Source Code Controller Metadata Missing Source Files Compiler test", () => {
  it("should compile with errors without failure", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const sourceCodeCompiler = new SourceCodeControllerMetadataCompiler(logger,[
      "./source/test/example/controllers.ts",
      "./source/test/example/dto-definitions.d.ts",
      // remove required reference
      //"./source/test/example/dto-definitions-extra.d.ts"
    ]);
    const sourceCode: IApi = compile("out/sourceCode.json", sourceCodeCompiler)
    expect(sourceCode.errors.length).to.greaterThan(0, `Should get error about missing types`)
  });
})

describe("Controller Metadata Compiler test", () => {
  let reflected: IApi;
  let sourceCode: IApi;

  it("'Runtime' should compile without failure or errors", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
    reflected = compile("out/reflected.json", reflectCompiler, true)
    expect(reflected.errors.length).to.eq(0, `Runtime Compiler should not get errors`)
  });

  it("'Source Code' should compile without failure or errors", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const sourceCodeCompiler = new SourceCodeControllerMetadataCompiler(logger,[
      "./source/test/example/controllers.ts",
      "./source/test/example/dto-definitions.d.ts",
      "./source/test/example/dto-definitions-extra.d.ts"
    ]);
    sourceCode = compile("out/sourceCode.json", sourceCodeCompiler, true)
    expect(sourceCode.errors.length).to.eq(0, `Source Code Compiler should not get errors`)

    var rts = ApiControllerExplorer.gatherRouteTypes(sourceCode.controllers);
    rts.forEach(rt => {
      if (rt.kind === TypeKind.Simple && rt.name === "void") {
          return;
      }
      var tv = ApiControllerVisitor.makeTypeValue(rt, sourceCode.referenceTypes);
      //console.log(rt.name, rt.kind, tv);

      expect(tv, "Type Value").to.be.ok;
      expect(tv.length).to.be.gt(0, "should not have empty value");

      var jsonObject = JSON.parse(tv);
      expect(jsonObject, "jsonObject").to.be.ok;

      var json = JSON.stringify(jsonObject);
      expect(json, "json").to.be.ok;
      expect(json.length).to.be.gt(0, "should have not empty value");
    })

  });

  it("'Runtime' and 'Source Code' should have matching metadatas (excluding type information)", () => {
    //expect(reflected.metadatas.length).to.eq(sourceCode.metadatas.length);
    Helper.compareArrayValues("Reflected Metadata",reflected.controllers, "Source Metadata", sourceCode.controllers, m => m.name, (l, r, name) => {
      expect(l.routes.length).to.eq(r.routes.length, `sourceCode ${name} routes length doesnt match reflected`)
      expect(l.controllerClass).to.eq(r.controllerClass)

      Helper.compareArrayValues("Reflected Routes", l.routes, "Source Routes", r.routes, rt => rt.name, (lr, rr) => {
        expect(lr.memberName).to.eq(rr.memberName)
        Helper.compareArrayValues("Reflected Middlewares", lr.middlewares, "Source Middlewares", rr.middlewares, rt => rt)
        Helper.compareArrayValues("Reflected RouteVerbs", lr.routeVerbs, "Source RouteVerbs", rr.routeVerbs, rt => rt.route + rt.verb)
      })
    })
  });

  it("'Runtime' should have Controller Class", () => {
    reflected.controllers.forEach(m => expect(m.controllerClass, `${m.name} Controller Constructor`).to.be.not.undefined)
  });

  it("'Runtime' should not have type information", () => {
    expect(reflected.referenceTypes).to.be.undefined
    var rts = ApiControllerExplorer.gatherRouteTypes(reflected.controllers);
    expect(rts.length).to.be.eq(0, "Controllers should have no types")
  });

  it("'Source Code' should have Controller Class", () => {
    sourceCode.controllers.forEach(m => expect(m.controllerClass, `${m.name} Controller Constructor`).to.be.not.undefined)
  });

  it("'Source Code' should have type information", () => {
    expect(sourceCode.referenceTypes).to.be.not.undefined
    expect(sourceCode.referenceTypes.length).to.be.greaterThan(0)
    var rts = ApiControllerExplorer.gatherRouteTypes(sourceCode.controllers);
    expect(rts.length).to.be.gt(0, "Controllers should return types")
    var untyped = ApiControllerExplorer.gatherUntypedRoutes(sourceCode.controllers);
    expect(untyped.length).to.be.eq(0, "All Controller Routes should return types")
  });

  it("'Source Code' routes should have no Unknown type information", () => {
    const collect = collectTypes(sourceCode.controllers);
    const unknown = collect.filter(i => i.kind === TypeKind.Unknown);
    expect(unknown.length).to.be.eq(0, "Should not have Unknown Types")
  });

  it("'Source Code' routes should have no Enum or Interface type information (only EnumRef and/or InterfaceRef)", () => {
    const collect = collectTypes(sourceCode.controllers);
    const foundEnumInterfaceTypes = getEnumInterfaceTypes(collect);
    expect(foundEnumInterfaceTypes.length).to.be.eq(0, `There should be no Enums or Interfaces types within the Routes`)
    // const foundRefTypes = getRefTypes(collect.items);
    // expect(foundRefTypes.length).to.be.gt(0, `There should be EnumRefs or InterfaceRefs types within the Routes`)
  });

  it("'Source Code' referenceTypes should have no Enum or Interface type information (only EnumRef and/or InterfaceRef allowed)", () => {
    sourceCode.referenceTypes.forEach(rt => {
      const types = ApiControllerExplorer.gatherTypes([rt])
      const eis = getEnumInterfaceTypes(types.filter(i => i !== rt))
      expect(eis.length).to.be.eq(0, `There should be no Enums or Interfaces types within the Reference Types`)
    })
  });

  it("'Source Code' metadatas should have all referenceTypes required for all controller actions", () => {
    const collect = collectTypes(sourceCode.controllers);
    // Get Interface and Enum types defined within controller actions
    const foundRefTypes = getRefTypes(collect);

    const all: IApiType[] = [];
    // Check they all exist in Reference Types (collect all downstream types)
    foundRefTypes.forEach(rt => {
      const found = matchType(sourceCode.referenceTypes, rt);
      expect(found).to.be.not.undefined;
      if (found) {
        const types = ApiControllerExplorer.gatherTypes([found])
        all.push(...getEnumInterfaceTypes(types));
        all.push(...getRefTypes(types));
      }
    })


    // Get unique list of found types by grouping
    const grps = _.groupBy(all, a => a.name);
    const keys = _.keys(grps);
    // check our collection matches the Reference Types - first length, then search each item
    expect(sourceCode.referenceTypes.length).to.be.gte(keys.length, `Reference Types needs at least ${keys.sort()} :: actual ${sourceCode.referenceTypes.map(r => r.name).sort()}`)
    keys.forEach(k => {
      const g = grps[k][0];
      const found = matchType(sourceCode.referenceTypes, g);
      expect(found).to.be.not.undefined;
    })
  });
})
