"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCachingMethods = void 0;

var _dataloader = _interopRequireDefault(require("dataloader"));

var _helpers = require("./helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// https://github.com/graphql/dataloader#batch-function
const orderDocs = ids => docs => {
  const idMap = {};
  docs.forEach(doc => {
    idMap[doc._id] = doc;
  });
  return ids.map(id => idMap[id]);
};

const createCachingMethods = ({
  collection,
  cache
}) => {
  const loader = new _dataloader.default(ids => collection.find({
    _id: {
      $in: ids
    }
  }).toArray().then(orderDocs(ids)));
  const cachePrefix = `mongo-${(0, _helpers.getCollection)(collection).collectionName}-`;
  const methods = {
    findOneById: async (id, {
      ttl
    } = {}) => {
      const key = cachePrefix + id;
      const cacheDoc = await cache.get(key);

      if (cacheDoc) {
        return JSON.parse(cacheDoc);
      }

      const doc = await loader.load(id);

      if (Number.isInteger(ttl)) {
        // https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-caching#apollo-server-caching
        cache.set(key, JSON.stringify(doc), {
          ttl
        });
      }

      return doc;
    },
    findManyByIds: (ids, {
      ttl
    } = {}) => {
      return Promise.all(ids.map(id => methods.findOneById(id, {
        ttl
      })));
    },
    deleteFromCacheById: id => cache.delete(cachePrefix + id)
  };
  return methods;
};

exports.createCachingMethods = createCachingMethods;