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

@api.controller("MiddlewareController", "/middleware", b => b.add("one").add("two"))
class MiddlewareController {
  @api.route(":id")
  @api.verbs("get", "options")
  @api.middleware("three", "auto-remove-redundant-param")
  @api.middleware("simplelogger")
  get(req: IGetRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route(":key/:subKey?")
  @api.verbs("get", "options")
  @api.middleware("three")
  @api.middleware("logger", "getAll!!")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,{key: string, subKey?:string},IExtra>) {
    req.send(200,null)
  }
}

@api.controller("SimpleController", "/simple")
class SimpleController {
  @api.route(":id")
  @api.verbs("get", "options")
  get(req: IGetRequest<ISimpleResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.verbs("get")
  getAll(req: IRequest<void,ISimpleResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.controller("NoVerbsRouteController")
class NoVerbsRouteController {
  @api.route("/:id")
  get(req: IGetRequest<IComplexResponse,{id: string},void>) {
    req.send(200,null)
  }

  @api.route()
  @api.contentType("application/x-www-form-urlencoded")
  post(req: IRequest<ISimpleResponse,IComplexResponse,void,void>) {
    req.send(200,null)
  }
}
