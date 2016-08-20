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

You can then specify controllers and their routes:

```typescript
import {api,IApiRequest,IApiVoidRequest} from "rokot-apicontroller";

interface IGroup{
  id: string;
  name: string;
  members: IUser[];
}

interface IUser{
  id: string;
  name: string;
}

@api.include("middleware", "/middleware", ["one", "two"])
class MiddlewareController {
  @api.route(":id")
  @api.acceptVerbs("get", "options")
  @api.middleware("three")
  get(req: IApiVoidRequest<IGroup,{id: string},void>) {
    req.send(200, {id: req.params.id, name:"group", members:[{id:"1", name: "User 1"}]});
  }

  @api.route()
  @api.acceptVerbs("get", "options")
  getAll(req: IApiVoidRequest<IGroup[],void,void>) {
    req.send(200, [
      {id: "1", name:"group", members:[{id:"1", name: "User 1"}]}
    ]);
  }

  @api.route()
  post(req: IApiRequest<IGroup,IGroup,void,void>) {
    req.send(201, req.body);
  }

  @api.route(":id")
  delete(req: IApiVoidRequest<void,{id: string},void>) {
    var id = req.params.id;
    req.send(204)
  }
}
```

### Notes
The route methods should be instance members, and have a single param `req` of type `IApiRequest<TBody,TResponse,TParams,TQuery>`
It strongly types all aspects of the request to make consuming them simpler within the route

`IApiVoidRequest<TResponse,TParams,TQuery>` is a type alias for `IApiRequest<void,TResponse,TParams,TQuery>`

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
