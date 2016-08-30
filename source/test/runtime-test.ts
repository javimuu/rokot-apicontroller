import {expect,sinon,supertest,chai} from "rokot-test";
import {ApiBuilder} from "../server/apiBuilder";
import * as _ from "underscore";
import * as fs from "fs";
import {ConsoleLogger,Logger} from "rokot-log";
import {RouteBuilder} from "../routeBuilder";
import {api,apiControllers,middlewareFunctions} from "../decorators";
import {IMiddewareFunction,MiddewareFunctionDictionary, IApiBuilder,IApiControllerRoute, IApiRequestHandler, IApiController, IApi} from "../core";
import "./testControllers";
import "./testInvalidControllers";
import "./testMiddleware";

describe("middlewares", () => {
  it("should find 6 middlewares", () => {
    const keys = _.keys(middlewareFunctions);
    const values = _.values(middlewareFunctions);
    expect(keys.length).to.eq(6, keys.join(","))
    expect(values.filter(m => !!m.func).length).to.eq(6, "Should have a function on each middleware")
  })
})
describe("ApiControllerCompiler", () => {
  it("should find 2 routes on 'NoVerbsRouteController' controller", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleOnly = apiControllers.filter(a => a.name === "NoVerbsRouteController")
    const mws:MiddewareFunctionDictionary = {}
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(simpleOnly,mws)
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("NoVerbsRouteController_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].verbs.length).to.eq(1, `1st route should have 1 verb`)
    expect(api.controllers[0].routes[0].verbs[0]).to.eq("get", `1st route should have get verb`)
    expect(api.controllers[0].routes[1].name).to.eq("NoVerbsRouteController_post", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].verbs.length).to.eq(1, `2nd route should have 1 verb`)
    expect(api.controllers[0].routes[1].verbs[0]).to.eq("post", `2nd route should have post verb`)

    // const model = ApiControllerManager.createMiddlewareModel(simpleOnly,[])
    // if (model) {
    //}
    // var mw = new MiddlewareProvider(logger, mws)
    // var middleware = mw.get(simpleOnly);
    // expect(_.keys(middleware).length).to.eq(0, `Should have no middleware`)
    // for (var key in middleware) {
    //   expect(_.isFunction(middleware[key])).to.be.true;
    // }
  });
  it("should find 2 routes on 'SimpleController' controller", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleOnly = apiControllers.filter(a => a.name === "SimpleController")
    const mws:MiddewareFunctionDictionary = {}
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(simpleOnly,mws)
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("SimpleController_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].verbs.length).to.eq(2, `1st route should have 2 verbs`)
    expect(api.controllers[0].routes[0].verbs[0]).to.eq("get", `1st route should have get verb`)
    expect(api.controllers[0].routes[0].verbs[1]).to.eq("options", `1st route should have get verb`)
    expect(api.controllers[0].routes[1].name).to.eq("SimpleController_getAll", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].verbs.length).to.eq(1, `2nd route should have 1 verb`)
    expect(api.controllers[0].routes[0].verbs[0]).to.eq("get", `1st route should have get verb`)

    // var mw = new MiddlewareProvider(logger, mws)
    // var middleware = mw.get(simpleOnly);
    // expect(_.keys(middleware).length).to.eq(0, `Should have no middleware`)
    // for (var key in middleware) {
    //   expect(_.isFunction(middleware[key])).to.be.true;
    // }
  });

  it("should find 2 routes on 'MiddlewareController' controller with metadata", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const middlewareOnly = apiControllers.filter(a => a.name === "MiddlewareController")
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(middlewareOnly,middlewareFunctions)
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(0, `Should get no errors`)
    expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    expect(api.controllers[0].routes[0].name).to.eq("MiddlewareController_get", `1st route should be 'get'`)
    expect(api.controllers[0].routes[0].middlewares.length).to.eq(4, `1st route should have 4 middleware`)
    expect(api.controllers[0].routes[1].name).to.eq("MiddlewareController_getAll", `2nd route should be 'get'`)
    expect(api.controllers[0].routes[1].middlewares.length).to.eq(4, `2nd route should have 4 middleware`)

    // var mw = new MiddlewareProvider(logger, middlewares)
    // var middleware = mw.get(middlewareOnly);
    // expect(_.keys(middleware).length).to.eq(3, `Should have 3 middleware`)
  });

  it("should find 2 route errors on 'MiddlewareFailureController' controller with metadata", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const middlewareOnly = apiControllers.filter(a => a.name === "MiddlewareFailureController")
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(middlewareOnly,middlewareFunctions)
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(2, `Should get 2 errors ${api.errors.join(":")}`)
    // expect(api.controllers.length).to.eq(1, `Should get 1 controller`)
    // expect(api.controllers[0].routes.length).to.eq(2, `Should get 2 routes`)
    // expect(api.controllers[0].routes.filter(m => !!m.func).length).to.eq(2, "Should have a function on each route")
    // expect(api.controllers[0].routes[0].name).to.eq("middleware_get", `1st route should be 'get'`)
    // expect(api.controllers[0].routes[0].middlewares.length).to.eq(3, `1st route should have 3 middleware`)
    // expect(api.controllers[0].routes[1].name).to.eq("middleware_getAll", `2nd route should be 'get'`)
    // expect(api.controllers[0].routes[1].middlewares.length).to.eq(4, `2nd route should have 4 middleware`)

    // var mw = new MiddlewareProvider(logger, middlewares)
    // var middleware = mw.get(middlewareOnly);
    // expect(_.keys(middleware).length).to.eq(3, `Should have 3 middleware`)
  });

  it("should fail on 'SimpleController' and 'SimpleRouteClashController' routes - two clashes (1 route with 2 verbs)", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const simpleAndClashOnly = apiControllers.filter(a => a.name === "SimpleController" || a.name === "SimpleRouteClashController")
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(simpleAndClashOnly,{})
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(2, `Should get 2 errors`)
    //console.log(api.errors)
  });
  it("should fail on 'MissingMiddlewareController' route - 1 missing middleware", () => {
    const logger = ConsoleLogger.create("test",{level:"info"});
    const missingMiddlewareOnly = apiControllers.filter(a => a.name === "MissingMiddlewareController")
    const controllerCompiler = new ApiBuilder(logger)
    const api = controllerCompiler.build(missingMiddlewareOnly,middlewareFunctions)
    //var api = compile("out/reflected.json", controllerCompiler)
    expect(api.errors.length).to.eq(1, `Should get 1 errors`)
    //console.log(api.errors)
  });
})

// describe("Route Builder test", () => {
//   it("should build routes from the Api", () => {
//     const logger = ConsoleLogger.create("test",{level:"info"});
//     const controllerCompiler = new RuntimeControllerMetadataCompiler(apiControllers,middlewares,logger)
//     var api = compile("out/reflected.json", controllerCompiler)
//     var builder = new TestRouteBuilder(logger);
//     var ok = builder.build(api);
//     expect(ok).to.be.true;
//     var rC = 0;
//     var rvC = 0;
//     ApiControllerManager.forEachControllerRoute(api.controllers, (c,r) =>{
//       rC += 1;
//       rvC += r.routeVerbs.length;
//     })
//     expect(builder.routes.length).to.be.eq(rvC, "Should have one route per controller route verb")
//     expect(builder.routeRequests.length).to.be.eq(rC, "Should have one routeRequests per controller route")
//   });
// })
//
// describe("Controller Metadata Compiler test", () => {
//   let reflected: IApi;
//   let sourceCode: IApi;
//
//   it("'Runtime' should compile without failure or errors", () => {
//     const logger = ConsoleLogger.create("test",{level:"info"});
//     const controllerCompiler = new RuntimeControllerMetadataCompiler(apiControllers,middlewares,logger)
//     reflected = compile("out/reflected.json", controllerCompiler, true)
//     expect(reflected.errors.length).to.eq(0, `Runtime Compiler should not get errors`)
//   });
//
//   it("'Runtime' should have Controller Class", () => {
//     reflected.controllers.forEach(m => expect(m.controllerClass, `${m.name} Controller Constructor`).to.be.not.undefined)
//   });
//
//   // it("'Runtime' should not have type information", () => {
//   //   expect(reflected.referenceTypes).to.be.undefined
//   //   var rts = ApiControllerManager.gatherRouteTypes(reflected.controllers);
//   //   expect(rts.length).to.be.eq(0, "Controllers should have no types")
//   // });
// })
