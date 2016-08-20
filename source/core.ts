export interface IApiRequestHandler<TBody, TResponse, TParams, TQuery, TOriginal>{
  (req: IApiRequest<TBody, TResponse, TParams, TQuery, TOriginal>): void;
}

export interface IApiRequest<TBody, TResponse, TParams, TQuery, TOriginal>{
  sendOk(response?:TResponse)
  sendCreated(response?:TResponse)
  sendNoContent()
  send(statusCode: number, response?: any)
  body: TBody
  params: TParams
  query: TQuery
  original: TOriginal
}

export interface IApi {
  errors: string[]
  controllers: IApiController[];
}

export interface IApiController {
  name: string;
  routes: IApiControllerRoute[];
  /** only available at runtime */
  controllerClass?: INewableApiController;
}

export interface INewable<T>{
  new(...args:any[]): T
}
export interface IMiddewareFunction {
  key:string
  func: Function
}
export interface INewableConstructor<TNew extends INewable<T>, T>{
  (newable: TNew, name: string): T
}

export interface INewableApiController extends INewable<IApiController>{}

export interface INewableApiControllerConstructor extends INewableConstructor<INewableApiController, IApiController>{
}

export interface IApiControllerRoute {
  name: string
  memberName: string
  routeVerbs: IApiControllerRouteVerb[]
  middlewares?: string[]
  func: Function
}

export interface IApiControllerRouteVerb {
  route: string;
  verb: string
}

export interface IApiControllerCompiler{
  compile(apiControllers: IApiController[], middlewareKeys: string[]): IApi
}

export interface IRouteBuilder {
  build(): IApi
}
