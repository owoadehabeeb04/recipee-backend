'use strict';
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === 'function' ? Iterator : Object).prototype
      );
    return (
      (g.next = verb(0)),
      (g['throw'] = verb(1)),
      (g['return'] = verb(2)),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
var mongoose_1 = require('mongoose');
require('dotenv').config();
// Connect to MongoDB
function updateExistingRecipes() {
  return __awaiter(this, void 0, void 0, function () {
    var mongoUri,
      db,
      recipesCollection,
      recipesWithoutNewFields,
      updateResult,
      verifyRoleCreated,
      verifyIsPrivate,
      error_1;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          _a.trys.push([0, 6, 7, 9]);
          console.log('Connecting to MongoDB...');
          mongoUri = process.env.MONGODB_URI;
          if (!mongoUri) {
            throw new Error(
              'MONGODB_URI is not defined in the environment variables'
            );
          }
          return [4 /*yield*/, mongoose_1.default.connect(mongoUri)];
        case 1:
          _a.sent();
          console.log('Connected to MongoDB');
          db = mongoose_1.default.connection.db;
          if (!db) {
            throw new Error('Database connection is undefined');
          }
          recipesCollection = db.collection('recipes');
          return [
            4 /*yield*/,
            recipesCollection.countDocuments({
              $or: [
                { roleCreated: { $exists: false } },
                { isPrivate: { $exists: false } },
              ],
            }),
          ];
        case 2:
          recipesWithoutNewFields = _a.sent();
          console.log(
            'Found '.concat(
              recipesWithoutNewFields,
              ' recipes without the new fields'
            )
          );
          return [
            4 /*yield*/,
            recipesCollection.updateMany(
              { roleCreated: { $exists: false } },
              { $set: { roleCreated: 'admin', isPrivate: false } }
            ),
          ];
        case 3:
          updateResult = _a.sent();
          console.log(
            'Updated '.concat(
              updateResult.modifiedCount,
              ' recipes with default values:\n      - roleCreated: "admin"\n      - isPrivate: false\n    '
            )
          );
          return [
            4 /*yield*/,
            recipesCollection.countDocuments({ roleCreated: 'admin' }),
          ];
        case 4:
          verifyRoleCreated = _a.sent();
          return [
            4 /*yield*/,
            recipesCollection.countDocuments({ isPrivate: false }),
          ];
        case 5:
          verifyIsPrivate = _a.sent();
          console.log(
            'Verification:\n      - '
              .concat(
                verifyRoleCreated,
                ' recipes now have roleCreated="admin"\n      - '
              )
              .concat(
                verifyIsPrivate,
                ' recipes now have isPrivate=false\n    '
              )
          );
          return [3 /*break*/, 9];
        case 6:
          error_1 = _a.sent();
          console.error('Error in migration:', error_1);
          return [3 /*break*/, 9];
        case 7:
          return [4 /*yield*/, mongoose_1.default.disconnect()];
        case 8:
          _a.sent();
          console.log('Disconnected from MongoDB');
          return [7 /*endfinally*/];
        case 9:
          return [2 /*return*/];
      }
    });
  });
}
// Run the migration
updateExistingRecipes();
