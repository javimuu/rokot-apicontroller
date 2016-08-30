import {api} from "../decorators";
import {IExpressApiRequest} from "../express/routeBuilder";

export type IRequest<TBody, TResponse, TParams, TQuery> = IExpressApiRequest<TBody, TResponse, TParams, TQuery>
export type IGetRequest<TResponse, TParams, TQuery> = IExpressApiRequest<void, TResponse, TParams, TQuery>

export interface ISimpleResponse {
  name: string
}

interface IComplexResponse {
  age: number
  extra: IExtra[]
}

interface IExtra {

}

@api.include("MiddlewareController", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three", "simplelogger")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route(":key/:subKey?")
  @api.acceptVerbs("get", "options")
  @api.middleware("three", {key: "logger", params:["getAll!!"]})
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,{key: string, subKey?:string},IExtra>) {
    req.send(200,null)
  }
}

@api.include("SimpleController", "/simple")
class SimpleController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("NoVerbsRouteController")
class NoVerbsRouteController {
  @api.route("/:id")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},void>) {
    req.send(200,null)
  }

  @api.route()
  post(req: IRequest<void,ISimpleResponse|IComplexResponse,void,void>) {
    req.send(200,null)
  }
}
