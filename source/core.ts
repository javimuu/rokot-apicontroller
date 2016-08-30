export interface IApiRequestHandler<TBody, TResponse, TParams, TQuery, TNative>{
  (req: IApiRequest<TBody, TResponse, TParams, TQuery, TNative>): void;
}

export interface IApiRequest<TBody, TResponse, TParams, TQuery, TNative>{
  sendOk(response?:TResponse)
  sendCreated(response?:TResponse)
  sendNoContent()
  send(statusCode: number, response?: any)
  body: TBody
  headers: IStringDictionary<string>
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
  controllerClass?: INewable<any>;
}

export interface INewable<T>{
  new(...args:any[]): T
}

export interface IStringDictionary<T>{
  [key: string]: T
}

export interface IMiddewareFunction {
  key:string
  func: Function
  paramMin?: number
  paramMax?: number
}

// export interface IMiddewareFunctionProvider {
//   key:string
//   funcProvider: (...args) => Function
// }

export type MiddewareProviderType = string | IMiddewareProvider
export type MiddewareFunctionDictionary = IStringDictionary<IMiddewareFunction>

export interface IMiddewareProvider {
  key:string
  params: any[]
}

export interface INewableConstructor<T>{
  (newable: INewable<T>, name: string): T
}

export interface IApiControllerRoute {
  name: string
  memberName: string
  route: string
  verbs: string[]
  middlewares?: MiddewareProviderType[]
  func: Function
  validateBody?(item: any) : any
  validateParams?(item: any) : any
  validateQuery?(item: any) : any
}

// export interface IApiControllerRouteVerb {
//   route: string;
//   verb: string
// }

export interface IApiBuilder{
  build(apiControllers: IApiController[], middlewareFunctions: MiddewareFunctionDictionary): IApi
}

export interface IRouteBuilder {
  build(): IApi
}
