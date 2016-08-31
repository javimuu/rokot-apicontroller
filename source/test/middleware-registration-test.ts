import {expect,sinon,supertest,chai} from "rokot-test";
import * as _ from "underscore";
import {middlewareFunctions} from "../decorators";
import "./testMiddleware";

describe("middlewares", () => {
  it("should find 6 middlewares", () => {
    const keys = _.keys(middlewareFunctions);
    const values = _.values(middlewareFunctions);
    expect(keys.length).to.eq(6, keys.join(","))
    expect(values.filter(m => !!m.func).length).to.eq(6, "Should have a function on each middleware")
  })
})
