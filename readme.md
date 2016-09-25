# rokot-apicontroller

Rokot - [Rocketmakers](http://www.rocketmakers.com/) TypeScript NodeJs Platform

## Introduction

A typescript decorators based solution to declaratively define routes for REST based api
This library creates metadata about the defined routes to allow auto route generation

## Getting Started

### Installation
Install via `npm`
```
npm i rokot-apicontroller --save
```

## Example

If you want to specify any additional custom Middleware, you can define them as below and annotate with the `middleware` decorator

```typescript
import {api} from "rokot-apicontroller";

class Middleware {
  @api.middlewareFunction("one")
  static one = (req: Express.Request, res: Express.Response, next: () => void) => {
    console.log("one")
    next();
  }
  @api.middlewareFunction("two")
  static two(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("two")
    next();
  }
  @api.middlewareFunction("three")
  three(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("three")
    next();
  }

  @api.middlewareProviderFunction("logger", 1)
  static logger(log:string){
    return (req: Express.Request, res: Express.Response, next: () => void) => {
      console.log(log, req)
      next();
    }
  }

  @api.middlewareProviderFunction("simplelogger",0, 1)
  static simplelogger(log?:string){
    return (req: Express.Request, res: Express.Response, next: () => void) => {
      console.log(log || "Unknown", req)
      next();
    }
  }
}
```

You can optionally register the middleware directly via the `registerMiddlewareFunction` method
```typescript
import {registerMiddlewareFunction} from "rokot-apicontroller";

registerMiddlewareFunction("four", (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("four")
  next();
})

```

You can optionally create your own request to shape the request handler object:

```typescript
import {IExpressApiRequest, ExpressRouteBuilder, ExpressApiRequest, IExpressRequest} from "rokot-apicontroller";
import * as express from "express";

export interface IUser{
  id: string;
  userName: string
}

export interface IRequest<TBody, TResponse, TParams, TQuery> extends IExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  isAuthenticated(): boolean
  isUnauthenticated(): boolean
  user: IUser
}

export interface IGetRequest<TResponse, TParams, TQuery> extends IRequest<void, TResponse, TParams, TQuery>{
}

export class CustomExpressApiRequest<TBody, TResponse, TParams, TQuery>
  extends ExpressApiRequest<TBody, TResponse, TParams, TQuery>
  implements IRequest<TBody, TResponse, TParams, TQuery> {
  user: IUser
  constructor(native: IExpressRequest){
    super(native)
    this.user = native.request.user;
  }
  isAuthenticated(): boolean{
    return this.native.request.isAuthenticated()
  }
  isUnauthenticated(): boolean{
    return this.native.request.isUnauthenticated()
  }
}

export class CustomExpressRouteBuilder extends ExpressRouteBuilder{
  protected createHandler(req: IExpressRequest){
    return new CustomExpressApiRequest<any, any, any, any>(req)
  }
}
```

You can then specify controllers and their routes:

```typescript
import {api} from "rokot-apicontroller";
import {IRequest, IGetRequest, IUser} from "./expressRequest"; // from file above
import * as express from "express";


interface IGroup{
  id: string;
  name: string;
  members: IUser[];
}

/*
Register the MiddlewareController
: all route paths are prefixed with "/middleware"
: all routes use the middleware function "one"
  then the resolved middleware via provider "logger"
  (using "MiddlewareController" as the required param)
*/
@api.controller("MiddlewareController", "/middleware", b => b.add("one").add("logger", "MiddlewareController"))
class MiddlewareController {

  @api.route(":id")
  @api.verbs("get", "options")
  @api.middleware("two")
  @api.middleware("three")
  get(req: IGetRequest<IGroup,{id: string},void>) {
    req.sendOk({id: req.params.id, name:"group", members:[{id:"1", name: "User 1"}]});
  }

  @api.route()
  @api.verbs("get", "options")
  getAll(req: IGetRequest<IGroup[],void,void>) {
    req.sendOk([
      {id: "1", name:"group", members:[{id:"1", name: "User 1"}]}
    ]);
  }

  @api.route()
  @api.contentType("application/x-www-form-urlencoded")
  post(req: IRequest<IGroup,IGroup,void,void>) {
    req.sendCreated(req.body);
  }

  @api.route(":id")
  delete(req: IGetRequest<void,{id: string},void>) {
    var id = req.params.id;
    req.sendNoContent()
  }
}
```

To build your routes you can

```typescript
import {CustomExpressRouteBuilder} from "./expressRequest"; // from file above
import {ApiBuilder, apiControllers, middlewareFunctions} from "rokot-apicontroller";
import {ConsoleLogger} from "rokot-log";
import * as express from 'express';

const app = express();
const logger = ConsoleLogger.create("Api Routes", {level: "trace"});

const apiBuilder = new ApiBuilder(logger)
const runtimeApi = apiBuilder.buildRuntime(apiControllers, middlewareFunctions)
if (runtimeApi.errors && runtimeApi.errors.length) {
  console.log("Unable to build api model - Service stopping!")
  return;
}

const builder = new CustomExpressRouteBuilder(logger, app);
const ok = builder.build(runtimeApi);
if (!ok) {
  console.log("Unable to build express routes - Service stopping!")
  return;
}

app.listen(this.port, () => {
  console.log(`Server listening on port ${this.port}!`);
});

```

### Notes
The route methods should be instance members, and have a single param `req` of type `IApiRequest<TBody,TResponse,TParams,TQuery,TNative>`
It strongly types all aspects of the request to make consuming them simpler within the route


There is a corresponding `IExpressApiRequest<TBody, TResponse, TParams, TQuery>` that supplies the `TNative` with `{ request: express.Request, response: express.Response, next: express.NextFunction }`

The `@api.controller` decorator allows you to specify a controller name, route path prefix, and optionally the middleware keys to apply to all the controller contained routes.

NOTE: Its strongly recommended to supply the name of the class as the first parameter of `@api.controller`

The `@api.route` decorator must be supplied on all controller routes, it specifies the route path of the operation.

The optional `@api.middleware("three")` decorator on the route method allows you to specify addition middleware to implement within the route (you can apply this decorator multiple times per route to add additional middleware's).

The controllers middleware will run (in specified order) before the routes middleware is run (also in specified order)

The route verb (`get`,`put`,`post`,`delete` etc) is determined by the following rules:

1. If the route method is named exactly as a verb - that verb is used.
2. If you specify the optional `@api.verbs(...)` decorator - that verb (or those verbs) will be used.
3. if all else fails, `get`.

The route path is determined by combining the (optional) `routePrefix` from `@api.controller` with the `@api.route` decorator values

The optional `@api.contentType` decorator can be applied once on any controller routes, it specifies the content type of the request body (the default is `"application/json"`).

## Consumed Libraries

### [rokot-test](https://github.com/Rocketmakers/rokot-test)
The testing framework used within the Rokot Platform!
