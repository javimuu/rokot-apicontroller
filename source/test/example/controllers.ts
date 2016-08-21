import {api} from "../../decorators";
import {IExpressApiRequest} from "../../expressRouteBuilder";

export type IRequest<TBody, TResponse, TParams, TQuery> = IExpressApiRequest<TBody, TResponse, TParams, TQuery>
export type IVoidRequest<TResponse, TParams, TQuery> = IRequest<void, TResponse, TParams, TQuery>

@api.include("middleware", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three")
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IVoidRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simple", "/simple")
class SimpleController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IVoidRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simpleClash")
class SimpleRouteClashController {
  @api.route("simple/:id")
  @api.acceptVerbs("get", "options")
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IVoidRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("empty", "/empty")
class EmptyController {
}
