/** The complete set of Http Verbs supported */
export type HttpVerb = "options" | "get" | "head" | "post" | "put" | "delete" | "patch"

// NOTE: Its important to keep AllowedHttpVerbs and HttpVerbs in sync
/** The complete set of Http Verbs supported (as [] )*/
export const AllowedHttpVerbs: HttpVerb[] = ["options", "get", "head", "post", "put", "delete", "patch"]

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

/** Describes a validated list of Api Controllers */
export interface IApi {
  /** the errors found during production */
  errors?: string[]
  /** the validated list of controllers (with empty controllers removed) */
  controllers: IApiController[];
}

/** Describes a validated list of Api Controllers */
export interface IRuntimeApi extends IApi {
  /** The set of middleware functions required */
  middlewareFunctions: MiddewareFunctionDictionary
}

/** Describes the Api Controller */
export interface IApiController {
  /** The controller name - NOTE: recommended to make this the class name */
  name: string;
  /** The routes of the controller */
  routes: IApiControllerRoute[];
  /** the controller class, creates an instance of the Api Controller */
  controllerClass: INewable<any>;
}

export interface INewable<T>{
  new(...args:any[]): T
}

export interface IStringDictionary<T>{
  [key: string]: T
}

/** The middleware function */
export interface IMiddewareFunction {
  /** The unique key of the middleware function */
  key:string
  /** The middleware function (or a middleware function provider) */
  func: Function
  /** Optional, the minimum number of parameters required to call the provider func */
  paramMin?: number
  /** Optional, the maximum number of parameters required to call the provider func */
  paramMax?: number
}

// export interface IMiddewareFunctionProvider {
//   key:string
//   funcProvider: (...args) => Function
// }

/** The middleware function dictionary */
export type MiddewareFunctionDictionary = IStringDictionary<IMiddewareFunction>

/** A key used to find a registered middleware function (or middleware function provider if params provided) */
export interface IMiddlewareKey {
  /** The unique key of the middleware function */
  key:string
  /** The optional params, only required if the middleware key indicates a middleware provider function */
  params?: any[]
}

export interface INewableConstructor<T>{
  (newable: INewable<T>, name: string): T
}

/** Describes an Api Controller route */
export interface IApiControllerRoute {
  /** the unique name of the route */
  name: string
  /** the name of the member expressing the route */
  memberName: string
  /** the route path */
  route: string
  /** the route content type (defaults to "application/json") */
  contentType: string
  /** the accepted http verbs */
  verbs: HttpVerb[]
  /** the list of middleware keys applied to the route (includes parent controller routes first) */
  middlewares?: IMiddlewareKey[]
  /** the routes endpoint handler function */
  func: Function
  /** a function to validate the body */
  validateBody?(body: any) : any
  /** a function to validate the route path params */
  validateParams?(params: any) : any
  /** a function to validate the route query string object */
  validateQuery?(query: any) : any
}
