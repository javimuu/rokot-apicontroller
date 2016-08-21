export interface IApiRequestHandler<TBody, TResponse, TParams, TQuery, TNative>{
  (req: IApiRequest<TBody, TResponse, TParams, TQuery, TNative>): void;
}

export interface IApiRequest<TBody, TResponse, TParams, TQuery, TNative>{
  sendOk(response?:TResponse)
  sendCreated(response?:TResponse)
  sendNoContent()
  send(statusCode: number, response?: any)
  body: TBody
  headers: {[key:string]: string}
  params: TParams
  query: TQuery
  native: TNative
}

export interface IApi {
  errors: string[]
  controllers: IApiController[];
}

export interface IApiController {
  name: string;
  routes: IApiControllerRoute[];
  /** only available at runtime */
  controllerClass?: INewable<any>;
}

export interface INewable<T>{
  new(...args:any[]): T
}
export interface IMiddewareFunction {
  key:string
  func: Function
}

export interface INewableConstructor<T>{
  (newable: INewable<T>, name: string): T
}

export interface IApiControllerRoute {
  name: string
  memberName: string
  routeVerbs: IApiControllerRouteVerb[]
  middlewares?: string[]
  func: Function
  validateBody?(item: any) : any
  validateParams?(item: any) : any
  validateQuery?(item: any) : any
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
