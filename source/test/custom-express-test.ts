import {expect,sinon,supertest,chai} from "rokot-test";
import * as _ from "underscore";
import * as fs from "fs";
import {ConsoleLogger,Logger} from "rokot-log";
import "./testMiddleware";
import {ExpressRouteBuilder, ExpressApiRequest,IExpressApiRequest} from "../expressRouteBuilder";
import * as express from "express";
import {api,apiControllers, middlewares} from "../decorators";
export interface IUser{
  id: string;
  userName: string
}

export interface IRequest<TBody, TResponse, TParams, TQuery> extends IExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  isAuthenticated(): boolean
}

export interface IVoidRequest<TResponse, TParams, TQuery> extends IExpressApiRequest<void, TResponse, TParams, TQuery>{
  isAuthenticated(): boolean
}

export class CustomExpressApiRequest<TBody, TResponse, TParams, TQuery> extends ExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  isAuthenticated(): boolean{
    throw new Error("Arghh")
  }
}
export class CustomExpressRouteBuilder extends ExpressRouteBuilder{
  protected createHandler(req: express.Request, res: express.Response){
    return new CustomExpressApiRequest<any, any, any, any>({req,res})
  }
}

@api.include("auth", "/auth")
class AuthController {
  @api.route(":id")
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    if (req.isAuthenticated()) {
      req.sendOk(null)
    }
    req.send(400,null)
  }
}
describe("Custom ExpressRouteBuilder", () => {
  it("should compile 'auth' without errors", () => {
    const logger = ConsoleLogger.create("Api Routes", {level: "trace"});
    const spy = sinon.spy()
    const app = {get:spy} as any
    const builder = new CustomExpressRouteBuilder(logger, app, apiControllers.filter(c => c.name === "auth"),middlewares);
    const api = builder.build();
    expect(api.errors.length).to.eq(0, "Should have no errors")
    expect(api.controllers.length).to.eq(1, "Should have 1 controller")
    expect(api.controllers[0].routes.length).to.eq(1, "Should have 1 routes")
    expect(spy.callCount).to.eq(1)
    expect(spy.firstCall.args.length).to.eq(2)
    expect(spy.firstCall.args[0]).to.eq("/auth/:id")
    //expect(spy.firstCall.args[1]).to.eq("/auth/:id")
    expect(() => spy.firstCall.args[1]({req:{}})).to.throw()
  })
})
