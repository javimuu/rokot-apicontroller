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


@api.controller("MiddlewareFailureController", "/middleware-failure", b => b.add("one").add("two"))
class MiddlewareFailureController {
  @api.route(":id")
  @api.verbs("get", "options")
  @api.middleware("logger")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.verbs("get", "options")
  @api.middleware("logger", "one", "two (many)")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.controller("MissingMiddlewareController", "/missingMiddleware", b => b.add("one").add("two"))
class MissingMiddlewareController {
  @api.route(":id")
  @api.verbs("get", "options")
  @api.middleware("five")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.sendOk({} as ISimpleResponse)
  }

  @api.route()
  @api.verbs("get", "options")
  getAll(req: IGetRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.sendOk({} as ISimpleResponse)
  }
}

@api.controller("SimpleRouteClashController")
class SimpleRouteClashController {
  @api.route("simple/:id")
  @api.verbs("get", "options")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.verbs("get", "options")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}
