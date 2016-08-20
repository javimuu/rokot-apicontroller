import {api} from "../../decorators";
import {IApiVoidRequest,IApiRequest} from "../../core";

@api.include("middleware", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simple", "/simple")
class SimpleController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("simpleClash")
class SimpleRouteClashController {
  @api.route("simple/:id")
  @api.acceptVerbs("get", "options")
  get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}

@api.include("empty", "/empty")
class EmptyController {
}
