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


@api.include("MiddlewareFailureController", "/middleware-failure", ["one", "two"])
class MiddlewareFailureController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("logger")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  @api.middleware({key: "logger", params:["too many", "too many"]})
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("MissingMiddlewareController", "/missingMiddleware", ["one", "two"])
class MissingMiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("five")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.sendOk(null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IGetRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.sendOk(null)
  }
}

@api.include("SimpleRouteClashController")
class SimpleRouteClashController {
  @api.route("simple/:id")
  @api.acceptVerbs("get", "options")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}
