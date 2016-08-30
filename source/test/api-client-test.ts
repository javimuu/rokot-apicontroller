import {expect,sinon,supertest,chai} from "rokot-test";
import * as _ from "underscore";
import {ConsoleLogger,Logger} from "rokot-log";
import {ApiClientBuilder} from "../client/apiClientBuilder";
import {ApiBuilder} from "../server/apiBuilder";
import {expressClientWriter} from "../express/clientWriter";
import {FileStreamWriter} from "../fileStreamWriter";
import {apiControllers,middlewareFunctions} from "../decorators";
import "./testControllers";
import "./testInvalidControllers";
import "./testMiddleware";

describe("Api Client test", () => {
  it("should build client routes from the Api", () => {
    const logger = ConsoleLogger.create("Api Client test",{level:"trace"});
    const apiBuilder = new ApiBuilder(logger);
    const workingOnly = apiControllers.filter(a => a.name === "MiddlewareController" || a.name === "SimpleController" || a.name === "NoVerbsRouteController")
    const api = apiBuilder.build(workingOnly, middlewareFunctions)
    expect(api.errors).to.not.be.undefined
    expect(api.errors.length).to.eq(0)
    expect(api.controllers).to.not.be.undefined
    expect(api.controllers.length).to.eq(3)
    expect(FileStreamWriter.write("./out/api.json", stream => {
      stream.write(JSON.stringify(api, null, 2))
    })).eventually.fulfilled

    const apiClientBuilder = new ApiClientBuilder(logger)
    const apiClient = apiClientBuilder.build(["./source/test/testControllers.ts"], api)

    expect(apiClient.controllers.length).to.eq(api.controllers.length)
    apiClient.controllers.forEach(c => {
      expect(c.routes.length).to.gt(0)
    })
    expect(FileStreamWriter.write("./out/apiClient.json", stream => {
      stream.write(JSON.stringify(apiClient, null, 2))
    })).eventually.fulfilled

    expect(expressClientWriter("./out/client.ts", apiClient)).eventually.fulfilled
  })
})
