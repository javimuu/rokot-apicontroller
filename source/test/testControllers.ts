import {api} from "../decorators";
import {IExpressApiRequest} from "../expressRouteBuilder";

export type IRequest<TBody, TResponse, TParams, TQuery> = IExpressApiRequest<TBody, TResponse, TParams, TQuery>
export type IVoidRequest<TResponse, TParams, TQuery> = IExpressApiRequest<void, TResponse, TParams, TQuery>

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
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("missingMiddleware", "/missingMiddleware", ["one", "two"])
class MissingMiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("five")
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.sendOk(null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IVoidRequest<ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.sendOk(null)
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
  @api.acceptVerbs("get")
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
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
  getAll(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("noVerbs")
class NoVerbsRouteController {
  @api.route()
  get(req: IVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  post(req: IRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}
