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
typings install body-parser express express-serve-static-core mime node serve-static underscore -SA
```

## Example

If you want to specify any additional custom Middleware, you can define them as below and annotate with the `middleware` decorator

```typescript
import {middleware} from "rokot-apicontroller";

class Middleware {
  @middleware("one")
  static one = (req: Express.Request, res: Express.Response, next: () => void) => {
    console.log("one")
    next();
  }
  @middleware("two")
  static two(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("two")
    next();
  }
}
```

You can optionally register the middleware directly via the `middlewareRegistry`
```typescript
import {middlewareRegistry} from "rokot-apicontroller";

middlewareRegistry.register("three", (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("three")
  next();
})

middlewareRegistry.register("other", someImportedMiddleware);
```

You can then specify controllers and their routes:

```typescript
import {controller,acceptVerbs,route,routePrefix,middlewareKeys,IApiRequest,IApiVoidRequest} from "rokot-apicontroller";

interface IGroup{
  id: string;
  name: string;
  members: IUser[];
}

interface IUser{
  id: string;
  name: string;
}

@controller("groups",["one"])
@routePrefix("groups")
export class GroupController {
  @route(":id")
  @middlewareKeys("two")
  get(req: IApiVoidRequest<IGroup,{id: string},void>) {
    req.send(200, {id: req.params.id, name:"group", members:[{id:"1", name: "User 1"}]});
  }

  @acceptVerbs("get")
  getAll(req: IApiVoidRequest<IGroup[],void,void>) {
    req.send(200, [
      {id: "1", name:"group", members:[{id:"1", name: "User 1"}]}
    ]);
  }

  post(req: IApiRequest<IGroup,IGroup,void,void>) {
    req.send(201, req.body);
  }

  @route(":id")
  delete(req: IApiVoidRequest<void,{id: string},void>) {
    var id = req.params.id;
    req.send(204)
  }
}
```

### Notes
The route methods have a single param `req` of type `IApiRequest<TBody,TResponse,TParams,TQuery>`
This is used 2 fold:

1. It strongly types all aspects of the request to make consuming them simpler within the route
2. It allows the `SourceCodeControllerMetadataCompiler` to extract the full metadata and allow the creation of api clients

`IApiVoidRequest<TResponse,TParams,TQuery>` is a type alias for `IApiRequest<void,TResponse,TParams,TQuery>`

The `@controller` decorator allows you to specify a controller name and optionally the middleware keys to apply to all the controller contained routes.

The `@middlewareKeys` decorator on the route method allows you to specify addition middleware to implement within the route.

The controllers middleware will run (in specified order) before the routes middleware is run (also in specified order)

The route verb (`get`,`put`,`post`,`delete` etc) is determined by:

1. If the route method is named exactly as a verb - that verb is used.
2. If you specify an `@acceptVerbs("get", "head")` decorator - that verb (or those verbs) will be used.
3. if all else fails, `get`.

The route path is determined by combining the (optional) `@routePrefix` and `@route` decorator values

## Consumed Libraries

### [inversify](http://inversify.io/)
A great TypeScript IoC container framework!

### [rokot-test](https://github.com/Rocketmakers/rokot-test)
The testing framework used within the Rokot Platform!
