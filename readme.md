# rokot-apicontroller

Rokot - [Rocketmakers](http://www.rocketmakers.com/) TypeScript NodeJs Platform

## Introduction

A typescript decorators based solution to declaratively define routes for REST based api
This library creates metadata about the defined routes to allow api client and test generation

>The Rokot platform components heavily rely on usage of the [typings](https://github.com/typings/typings) utility for typescript definitions management.
If you don't have `typings` installed:
```
npm i typings -g
```

## Getting Started

### Installation
Install via `npm`
```
npm i rokot-apicontroller --save
```

### Typings

You will also need these ambient dependencies:
>NOTE: you might already have some of these ambient dependencies installed!

```
typings i dt~body-parser dt~bunyan dt~express dt~express-serve-static-core dt~mime dt~node dt~serve-static dt~underscore -SG
```

## Example

If you want to specify any additional custom Middleware, you can define them as below and annotate with the `middleware` decorator

```typescript
import {middleware} from "rokot-apicontroller";

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
}
```

You can optionally register the middleware directly via the `middlewares` registry
```typescript
import {middlewares} from "rokot-apicontroller";

middlewares.push({key: "four", func: (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("four")
  next();
}})

```

You can create your own request to customise the request object:

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

export interface IVoidRequest<TResponse, TParams, TQuery> extends IRequest<void, TResponse, TParams, TQuery>{
}

export class CustomExpressApiRequest<TBody, TResponse, TParams, TQuery> extends ExpressApiRequest<TBody, TResponse, TParams, TQuery>{
  user: IUser
  constructor(orig: IExpressRequest){
    super(orig)
    this.user = orig.req.user;
  }
  isAuthenticated(): boolean{
    return this.original.req.isAuthenticated()
  }
  isUnauthenticated(): boolean{
    return this.original.req.isUnauthenticated()
  }
}

export class CustomExpressRouteBuilder extends ExpressRouteBuilder{
  protected createHandler(req: express.Request, res: express.Response){
    return new CustomExpressApiRequest<any, any, any, any>({req,res})
  }
}
```

You can then specify controllers and their routes:

```typescript
import {api, IExpressApiRequest, ExpressRouteBuilder, ExpressApiRequest, IExpressRequest} from "rokot-apicontroller";
import {IRequest, IVoidRequest, IUser} from "./expressRequest"; // from file above
import * as express from "express";


interface IGroup{
  id: string;
  name: string;
  members: IUser[];
}

@api.include("middleware", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three")
  get(req: IVoidRequest<IGroup,{id: string},void>) {
    req.sendOk({id: req.params.id, name:"group", members:[{id:"1", name: "User 1"}]});
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IVoidRequest<IGroup[],void,void>) {
    req.sendOk([
      {id: "1", name:"group", members:[{id:"1", name: "User 1"}]}
    ]);
  }

  @api.route()
  post(req: IRequest<IGroup,IGroup,void,void>) {
    req.sendCreated(req.body);
  }

  @api.route(":id")
  delete(req: IVoidRequest<void,{id: string},void>) {
    var id = req.params.id;
    req.sendNoContent()
  }
}
```

To build your routes you can now
```typescript
import {CustomExpressRouteBuilder} from "./expressRequest"; // from file above
import {apiControllers, middlewares} from "rokot-apicontroller";
import {ConsoleLogger} from "rokot-log";
import * as express from 'express';

const app = express();
const logger = ConsoleLogger.create("Api Routes", {level: "trace"});

const builder = new CustomExpressRouteBuilder(logger, app, apiControllers, middlewares);
const api = builder.build();
if (!api || api.errors.length) {
  console.log("Unable to build express routes - Service stopping!")
  return;
}

app.listen(this.port, () => {
  console.log(`Cosmos listening on port ${this.port}!`);
});

```

### Notes
The route methods should be instance members, and have a single param `req` of type `IApiRequest<TBody,TResponse,TParams,TQuery,TOriginal>`
It strongly types all aspects of the request to make consuming them simpler within the route


There is a corresponding `IExpressApiRequest<TBody, TResponse, TParams, TQuery>` that supplies the `TOriginal` with `{ req: express.Request, res: express.Response }`


The `@api.include` decorator allows you to specify a controller name, path prefix, and optionally the middleware keys to apply to all the controller contained routes.

The `@api.middleware("three")` decorator on the route method allows you to specify addition middleware to implement within the route.

The controllers middleware will run (in specified order) before the routes middleware is run (also in specified order)

The route verb (`get`,`put`,`post`,`delete` etc) is determined by:

1. If the route method is named exactly as a verb - that verb is used.
2. If you specify an `@api.acceptVerbs(...)` decorator - that verb (or those verbs) will be used.
3. if all else fails, `get`.

The route path is determined by combining the (optional) `routePrefix` from `@api.include` and `@route` decorator values

## Consumed Libraries

### [rokot-test](https://github.com/Rocketmakers/rokot-test)
The testing framework used within the Rokot Platform!
