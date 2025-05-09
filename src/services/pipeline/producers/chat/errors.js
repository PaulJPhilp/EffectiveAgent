
/**
 * @file Chat service specific error types
 * @module services/ai/producers/chat/errors
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            (Array.isArray({ __proto__: [] }) && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatParameterError = exports.ChatToolError = exports.ChatInputError = exports.ChatCompletionError = exports.ChatProviderError = exports.ChatModelError = void 0;
var errors_js_1 = require("@/errors.js");
/**
 * Error thrown when there are issues with chat model configuration or access.
 * @extends EffectiveError
 */
var ChatModelError = /** @class */ (function (_super) {
    __extends(ChatModelError, _super);
    function ChatModelError(params) {
        return _super.call(this, params) || this;
    }
    return ChatModelError;
}(errors_js_1.EffectiveError));
exports.ChatModelError = ChatModelError;
/**
 * Error thrown when there are issues with chat provider configuration or access.
 * @extends EffectiveError
 */
var ChatProviderError = /** @class */ (function (_super) {
    __extends(ChatProviderError, _super);
    function ChatProviderError(params) {
        return _super.call(this, params) || this;
    }
    return ChatProviderError;
}(errors_js_1.EffectiveError));
exports.ChatProviderError = ChatProviderError;
/**
 * Error thrown when the chat completion request fails.
 * @extends EffectiveError
 */
var ChatCompletionError = /** @class */ (function (_super) {
    __extends(ChatCompletionError, _super);
    function ChatCompletionError(params) {
        return _super.call(this, params) || this;
    }
    return ChatCompletionError;
}(errors_js_1.EffectiveError));
exports.ChatCompletionError = ChatCompletionError;
/**
 * Error thrown when chat input validation fails.
 * @extends EffectiveError
 */
var ChatInputError = /** @class */ (function (_super) {
    __extends(ChatInputError, _super);
    function ChatInputError(params) {
        return _super.call(this, params) || this;
    }
    return ChatInputError;
}(errors_js_1.EffectiveError));
exports.ChatInputError = ChatInputError;
/**
 * Error thrown when tool configuration or usage fails.
 * @extends EffectiveError
 */
var ChatToolError = /** @class */ (function (_super) {
    __extends(ChatToolError, _super);
    function ChatToolError(params) {
        return _super.call(this, params) || this;
    }
    return ChatToolError;
}(errors_js_1.EffectiveError));
exports.ChatToolError = ChatToolError;
/**
 * Error thrown when parameter validation fails.
 * @extends EffectiveError
 */
var ChatParameterError = /** @class */ (function (_super) {
    __extends(ChatParameterError, _super);
    function ChatParameterError(params) {
        return _super.call(this, {
            description: "".concat(params.description, " (parameter: ").concat(params.parameter, ", value: ").concat(params.value, ")"),
            module: params.module,
            method: params.method,
            cause: params.cause
        }) || this;
    }
    return ChatParameterError;
}(errors_js_1.EffectiveError));
exports.ChatParameterError = ChatParameterError;
