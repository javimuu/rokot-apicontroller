import * as express from "express";
import * as bodyParser from "body-parser";
import * as http from "http";
import * as fs from "fs";
import "./controllers";
import "./middleware";
import {ExpressRouteBuilder} from "../../expressRouteBuilder";
import {ApiControllerCompiler} from "../../apiControllerCompiler";
//import {SourceCodeControllerMetadataCompiler} from "../../compilers/sourceCodeCompiler";
import {Logger,ConsoleLogger} from "rokot-log";
import {middlewares,apiControllers} from "../../decorators";
import {IApi, IApiControllerCompiler} from "../../core";
var logger = ConsoleLogger.create("test server", {level:"trace"})

class Server {
  static logRoutes(api: IApi, logger: Logger) {
    api.controllers.forEach(c => {
      logger.info("Controller: ", c.name);
      c.routes.forEach(r => {
        r.routeVerbs.forEach(rv => {
          logger.info(` - ${rv.route} (${rv.verb})${r.middlewares ? " => " : ""}${r.middlewares ? r.middlewares.join(", ") : ""}`)
        })
      })
    })
  }

  static init() {
    var app = express();
    app.use(express.static('static'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    const builder = new ExpressRouteBuilder(logger, app, apiControllers, middlewares);
    const api = builder.build();
    if (!api || api.errors.length) {
      console.log("Unable to build express routes - Service stopping!")
      return;
    }

    this.logRoutes(api, logger);

    var server = http.createServer(app).listen(3000, (err) => {
      if (err) throw err

      var add = server.address()
      console.log('Node API listening at http://%s:%s - %s', add.address, add.port, add.family);
    });
  }
}

// function compile(name: string, compiler: IApiControllerCompiler) {
//   const compiled = compiler.compile();
//   fs.writeFileSync(name, JSON.stringify(compiled, null, 2))
//   return compiled;
// }

// export class Boot{
//   static run(){
//     const reflectCompiler = new RuntimeControllerMetadataCompiler(logger)
//     const api = reflectCompiler.compile(apiControllers, middlewares.map(m => m.key));
//     if (api.errors.length) {
//       console.log("Unable to start express service - errors found during api controller compilation!")
//     } else{
//       Server.init();
//     }
//   }
// }
