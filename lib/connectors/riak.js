var safeRequire = require('../utils').safeRequire;

/**
 * Module dependencies
 */
var uuid = require('node-uuid');
var riak = safeRequire('riak-js');

exports.initialize = function initializeSchema(dataSource, callback) {
    dataSource.client = riak.getClient({
        host: dataSource.settings.host || '127.0.0.1',
        port: dataSource.settings.port || 8091
    });
    dataSource.connector = new Riak(dataSource.client);
};

function Riak(client) {
    this._models = {};
    this.client = client;
}

Riak.prototype.define = function (descr) {
    this._models[descr.model.modelName] = descr;
};

Riak.prototype.save = function (model, data, callback) {
    this.client.save(model, data.id, data, callback);
};

Riak.prototype.create = function (model, data, callback) {
    data.id = uuid();
    this.save(model, data, function (err) {
        if (callback) {
            callback(err, data.id);
        }
    });
};

Riak.prototype.exists = function (model, id, callback) {
    this.client.exists(model, id, function (err, exists, meta) {
        if (callback) {
            callback(err, exists);
        }
    });
};

Riak.prototype.find = function find(model, id, callback) {
    this.client.get(model, id, function (err, data, meta) {
        if (data && data.id) {
            data.id = id;
        } else {
            data = null;
        }
        if (typeof callback === 'function') callback(err, data);
    });
};

Riak.prototype.destroy = function destroy(model, id, callback) {
    this.client.remove(model, id, function (err) {
        callback(err);
    });
};

Riak.prototype.all = function all(model, filter, callback) {
    var opts = {};
    if (filter && filter.where) opts.where = filter.where;
    this.client.getAll(model, function (err, result, meta) {
        if (err) return callback(err, []);
        /// return callback(err, result.map(function (x) { return {id: x}; }));
        result = (result || []).map(function (row) {
            var record = row.data;
            record.id = row.meta.key;
            console.log(record);
            return record;
        });

        return callback(err, result);
    }.bind(this));
};

Riak.prototype.destroyAll = function destroyAll(model, callback) {
    var self = this;
    this.all(model, {}, function (err, recs) {
        if (err) callback(err);

        removeOne();

        function removeOne(error) {
            err = err || error;
            var rec = recs.pop();
            if (!rec) return callback(err && err.statusCode != '404' ? err : null);
            console.log(rec.id);
            self.client.remove(model, rec.id, removeOne);
        }

    });

};

Riak.prototype.count = function count(model, callback) {
    this.client.keys(model + ':*', function (err, keys) {
        callback(err, err ? null : keys.length);
    });
};

Riak.prototype.updateAttributes = function updateAttrs(model, id, data, cb) {
    data.id = id;
    this.save(model, data, cb);
};

