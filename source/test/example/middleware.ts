import * as express from "express";
//import {LoggerFactory,TRACE, Logger} from "rokot-log";
import {middleware,middlewareRegistry} from "../../decorators";
//var log = new LoggerFactory()

middlewareRegistry.register("four", (req: Express.Request, res: Express.Response, next: () => void) => {
  console.log("four")
  next();
})

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
  @middleware("three")
  three(req: Express.Request, res: Express.Response, next: () => void) {
    console.log("three")
    next();
  }
}
