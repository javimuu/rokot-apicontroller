import {api,registerMiddlewareFunction} from "../decorators";

registerMiddlewareFunction("four", (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("four")
  next();
})

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
