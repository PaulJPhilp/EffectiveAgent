"use strict"
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1]
          return t[1]
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype,
      )
    return (
      (g.next = verb(0)),
      (g["throw"] = verb(1)),
      (g["return"] = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this
        }),
      g
    )
    function verb(n) {
      return function (v) {
        return step([n, v])
      }
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.")
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                    ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t
          if (((y = 0), t)) op = [op[0] & 2, t.value]
          switch (op[0]) {
            case 0:
            case 1:
              t = op
              break
            case 4:
              _.label++
              return { value: op[1], done: false }
            case 5:
              _.label++
              y = op[1]
              op = [0]
              continue
            case 7:
              op = _.ops.pop()
              _.trys.pop()
              continue
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0
                continue
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1]
                break
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1]
                t = op
                break
              }
              if (t && _.label < t[2]) {
                _.label = t[2]
                _.ops.push(op)
                break
              }
              if (t[2]) _.ops.pop()
              _.trys.pop()
              continue
          }
          op = body.call(thisArg, _)
        } catch (e) {
          op = [6, e]
          y = 0
        } finally {
          f = t = 0
        }
      if (op[0] & 5) throw op[1]
      return { value: op[0] ? op[1] : void 0, done: true }
    }
  }
var __values =
  (this && this.__values) ||
  function (o) {
    var s = typeof Symbol === "function" && Symbol.iterator,
      m = s && o[s],
      i = 0
    if (m) return m.call(o)
    if (o && typeof o.length === "number")
      return {
        next: function () {
          if (o && i >= o.length) o = void 0
          return { value: o && o[i++], done: !o }
        },
      }
    throw new TypeError(
      s ? "Object is not iterable." : "Symbol.iterator is not defined.",
    )
  }
Object.defineProperty(exports, "__esModule", { value: true })
exports.createAgent = createAgent
// Boilerplate agent creation logic
var effect_1 = require("effect")
var path_1 = require("path")
var templates_js_1 = require("./templates.js")
var fs_js_1 = require("../services/fs.js")
/**
 * Creates a new agent with the specified name, including all necessary files and configurations.
 */
function createAgent(agentName) {
  return effect_1.Effect.gen(function () {
    var agentPath, srcPath, testPath
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          agentPath = (0, path_1.join)(process.cwd(), "agents", agentName)
          srcPath = (0, path_1.join)(agentPath, "src")
          testPath = (0, path_1.join)(agentPath, "__tests__")
          return [5 /*yield**/, __values((0, fs_js_1.exists)(agentPath))]
        case 1:
          // Check if agent already exists
          if (_a.sent()) {
            throw new Error(
              "EEXIST: Directory already exists: ".concat(agentPath),
            )
          }
          // Create directories
          return [
            5 /*yield**/,
            __values((0, fs_js_1.createDirectory)(agentPath)),
          ]
        case 2:
          // Create directories
          _a.sent()
          return [5 /*yield**/, __values((0, fs_js_1.createDirectory)(srcPath))]
        case 3:
          _a.sent()
          return [
            5 /*yield**/,
            __values((0, fs_js_1.createDirectory)(testPath)),
          ]
        case 4:
          _a.sent()
          // Write package.json
          return [
            5 /*yield**/,
            __values(
              (0, fs_js_1.writeJson)(
                (0, path_1.join)(agentPath, "package.json"),
                (0, templates_js_1.agentPackageJsonTemplate)(agentName),
                { indent: 2 },
              ),
            ),
          ]
        case 5:
          // Write package.json
          _a.sent()
          // Write tsconfig.json
          return [
            5 /*yield**/,
            __values(
              (0, fs_js_1.writeJson)(
                (0, path_1.join)(agentPath, "tsconfig.json"),
                templates_js_1.tsConfigTemplate,
                { indent: 2 },
              ),
            ),
          ]
        case 6:
          // Write tsconfig.json
          _a.sent()
          // Write vitest.config.ts
          return [
            5 /*yield**/,
            __values(
              (0, fs_js_1.writeJson)(
                (0, path_1.join)(agentPath, "vitest.config.ts"),
                templates_js_1.vitestConfigTemplate,
                { indent: 2 },
              ),
            ),
          ]
        case 7:
          // Write vitest.config.ts
          _a.sent()
          // Write agent source file
          return [
            5 /*yield**/,
            __values(
              (0, fs_js_1.writeJson)(
                (0, path_1.join)(srcPath, "index.ts"),
                templates_js_1.agentIndexTemplate,
                { indent: 2 },
              ),
            ),
          ]
        case 8:
          // Write agent source file
          _a.sent()
          // Write agent test file
          return [
            5 /*yield**/,
            __values(
              (0, fs_js_1.writeJson)(
                (0, path_1.join)(testPath, "index.test.ts"),
                templates_js_1.agentTestTemplate,
                { indent: 2 },
              ),
            ),
          ]
        case 9:
          // Write agent test file
          _a.sent()
          return [2 /*return*/]
      }
    })
  })
}
