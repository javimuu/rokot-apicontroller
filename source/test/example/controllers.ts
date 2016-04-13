import {routePrefix, acceptVerbs, route, controller, middlewareKeys} from "../../decorators";
import {IApiVoidRequest,IApiRequest} from "../../core";
interface IGrow {
  name: string;
}


@controller("simple")
@routePrefix("/simple")
class SimpleController {
  @route(":id")
  @acceptVerbs("get", "options")
  static get(req: IApiVoidRequest<ISimpleResponse|IComplexResponse,{id: string},IExtra>) {
    req.send(200,null)
  }

  @acceptVerbs("get", "options")
  static getAll(req: IApiRequest<void,ISimpleResponse|IComplexResponse,void,IExtra>) {
    req.send(200,null)
  }
}


export type MyUnionType = IThingResponse|IComplexResponse;

@controller("root")
@routePrefix("/root")
class RootController {
  @route(":id")
  static get(req: IApiRequest<ISimpleResponse|IComplexResponse,ISimpleResponse&IComplexResponse,{id: string},void>) {
    req.send(200,null)
  }

  @route(":id")
  static delete(req: IApiRequest<number,{id: {day: IGenericAnonResponse<string, {id: {key:string}}>, month?: number}}, {id: number},void>) {
    req.send(200,null)
  }

  static put(req: IApiRequest<{s: Services},{mood: Moods},void,void>) {
    req.send(200, {mood:Moods.Happy})
  }
  static post(req: IApiRequest<MyUnionType,{extra: IExtra},void,void>) {
    //req.body
    req.send(200,null)
  }
}

@controller("post", ["two", "four"])
@routePrefix("/posts")
class PostController {
  @middlewareKeys("one", "two")
  get(req: IApiRequest<IThingUnionIntersectionResponse,void,void,void>) {
    req.send(200)
  }

  post(req: IApiRequest<void,IThingResponse,void,void>) {
    req.send(200)
  }
}


@controller("users", ["four"])
@routePrefix("/users")
class StaticController {
  // @queryString<{ name: string, age?: number }>()
  // @requestType<IThingRequest>()
  // @responseType<IThing>()
  @route("")
  @middlewareKeys("one", "two", "three")
  @acceptVerbs("get", "put")
  static get(req: IApiRequest<string,void,{id: string},{ name: string, age?: number }>) {
    req.send(201)
  }

  // @responseType<IMissing>()
  @route("/put")
  static put = (req: IApiRequest<string,void,{id: string},{ name: string, age?: number }>) => {
    req.send(200)
  }

  @route("/post")
  post = (req: IApiRequest<string,void,{id: string},{ name: string, age?: number }>) => {
    req.send(200)
  }

}

@controller("empty")
@routePrefix("/empty")
class EmptyController {
}

@controller("devices")
@routePrefix("/devices")
class DeviceController {
  post(req: IApiRequest<string | string[],void,void,void>) {
    req.send(200)
  }

  get(req: IApiRequest<string,void,void,void>) {
    req.send(200)
  }

  // @responseType<string | string[]>()
  put(req: IApiRequest<IExtra,void,void,void>) {
    req.send(200)
  }

  // @requestType<IThingRequest>()
  // @responseType<IThing>()
  delete(req: IApiRequest<void,IAnotherExtra,void, void>) {
    req.send(200)
  }
}

@controller("groups", ["four"])
@routePrefix("groups")
class GroupController {
  exclude1 = "hhh"
  exclude2: string;
  exclude3: () => void;
  @route("lambda")
  hhh1 = (req: IApiRequest<string,void,{id: string},{ name: string, age?: number }>) => { }
  @route("")
  @acceptVerbs("post")
  post(req: IApiRequest<string,void,{id: string},{ name: string, age?: number }>) {
    req.send(200)
  }

  @route("")
  @acceptVerbs("get")
  get(req: IApiRequest<string,string,{id: string},{ name: string, age?: number }>) {
    req.send(200, this.exclude1)
  }

  @route("/lambda")
  @acceptVerbs("delete")
  delete(req: IApiRequest<string,string,{id: string},{ name: string, age?: number }>) {
    req.send(200, "yo")
  }
}
