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
exports.FileSystemLayer =
  exports.exists =
  exports.initializeProject =
  exports.writeFileString =
  exports.writeJson =
  exports.createDir =
    void 0
var platform_1 = require("@effect/platform")
var platform_node_1 = require("@effect/platform-node")
var effect_1 = require("effect")
var node_path_1 = require("node:path")
// Create directory if it doesn't exist
var createDir = function (path, options) {
  return effect_1.Effect.gen(function () {
    var fs, exists
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [5 /*yield**/, __values(platform_1.FileSystem.FileSystem)]
        case 1:
          fs = _a.sent()
          return [5 /*yield**/, __values(fs.exists(path))]
        case 2:
          exists = _a.sent()
          if (!!exists) return [3 /*break*/, 4]
          return [5 /*yield**/, __values(fs.makeDirectory(path, options))]
        case 3:
          _a.sent()
          _a.label = 4
        case 4:
          return [2 /*return*/]
      }
    })
  })
}
exports.createDir = createDir
// Write JSON file
var writeJson = function (path, data) {
  return effect_1.Effect.gen(function () {
    var fs
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [5 /*yield**/, __values(platform_1.FileSystem.FileSystem)]
        case 1:
          fs = _a.sent()
          return [
            5 /*yield**/,
            __values(fs.writeFileString(path, JSON.stringify(data, null, 2))),
          ]
        case 2:
          _a.sent()
          return [2 /*return*/]
      }
    })
  })
}
exports.writeJson = writeJson
// Write plain text file
var writeFileString = function (path, data) {
  return effect_1.Effect.gen(function () {
    var fs
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [5 /*yield**/, __values(platform_1.FileSystem.FileSystem)]
        case 1:
          fs = _a.sent()
          return [5 /*yield**/, __values(fs.writeFileString(path, data))]
        case 2:
          _a.sent()
          return [2 /*return*/]
      }
    })
  })
}
exports.writeFileString = writeFileString
// Initialize project structure
var initializeProject = function (projectPath) {
  return effect_1.Effect.gen(function () {
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          // Create main directories
          return [5 /*yield**/, __values((0, exports.createDir)(projectPath))]
        case 1:
          // Create main directories
          _a.sent()
          return [
            5 /*yield**/,
            __values(
              (0, exports.createDir)(
                (0, node_path_1.join)(projectPath, "ea-config"),
              ),
            ),
          ]
        case 2:
          _a.sent()
          return [
            5 /*yield**/,
            __values(
              (0, exports.createDir)(
                (0, node_path_1.join)(projectPath, "agents"),
              ),
            ),
          ]
        case 3:
          _a.sent()
          return [
            5 /*yield**/,
            __values(
              (0, exports.createDir)(
                (0, node_path_1.join)(projectPath, "logs"),
              ),
            ),
          ]
        case 4:
          _a.sent()
          return [2 /*return*/]
      }
    })
  })
}
exports.initializeProject = initializeProject
// Check if a file or directory exists
var exists = function (path) {
  return effect_1.Effect.gen(function () {
    var fs
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [5 /*yield**/, __values(platform_1.FileSystem.FileSystem)]
        case 1:
          fs = _a.sent()
          return [5 /*yield**/, __values(fs.exists(path))]
        case 2:
          return [2 /*return*/, _a.sent()]
      }
    })
  })
}
exports.exists = exists
// Layer for providing NodeContext
exports.FileSystemLayer = platform_node_1.NodeContext.layer
