(function () {
    if (!Array.prototype.select) {
        Array.prototype.select = function (arg) {
            var i = 0, len = this.length, result = [];
            if (len == 0) return result;
            while (i < len) {
                if (i in this && this[i]) {
                    if (typeof arg == "string" && this[i].hasOwnProperty(arg)) {
                        result.push(this[i][arg]);
                    } else if (typeof arg == "function") {
                        result.push(arg.call(this, this[i], i, this));
                    }
                }
                i++;
            }
            return result;
        }
    }
    if (!Array.prototype.sum) {
        Array.prototype.sum = function (f) {
            var i = 0, len = this.length, total = 0;
            if (len == 0) return total;
            while (i < len) {
                total += f.call(this, this[i], i, this);
                i++;
            }
            return total;
        }
    }
    if (!Array.prototype.count) {
        Array.prototype.count = function (f) {
            var i = 0, len = this.length, count = 0;
            if (len == 0) return count;
            while (i < len) {
                if (f.call(this, this[i], i, this)) {
                    count++;
                }
                i++;
            }
            return count;
        }
    }
    if (!Array.prototype.every) {
        Array.prototype.every = function (f) {
            var i = 0, len = this.length;
            if (len == 0) return true;
            while (i < len) {
                if (i in this && !f.call(this, this[i], i, this)) {
                    return false;
                }
                i++;
            }
            return true;
        }
    }
    if (!Array.prototype.all) {
        Array.prototype.all = function (f) {
            var i = 0, len = this.length;
            if (len == 0) return true;
            while (i < len) {
                if (i in this && !f.call(this, this[i], i, this)) {
                    return false;
                }
                i++;
            }
            return true;
        }
    }

    if (!Array.prototype.any) {
        Array.prototype.any = function (f) {
            var i = 0, len = this.length;
            if (len == 0) return false;
            while (i < len) {
                if (i in this && f.call(this, this[i], i, this)) {
                    return true;
                }
                i++;
            }
            return false;
        };
    }
    if (!Array.prototype.first) {
        Array.prototype.first = function (f) {
            var i = 0, len = this.length;
            if (len == 0) return null;
            while (i < len) {
                if (i in this && f.call(this, this[i], i, this)) {
                    return this[i];
                }
                i++;
            }
            return null;
        };
    }
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function (f) {
            var i = 0, len = this.length;
            if (len == 0) return;
            while (i < len) {
                if (i in this) {
                    var item = this[i];
                    //返回false则跳出循环
                    if (f.call(this, item, i, this) === false) break;
                    this[i] = item;
                }
                i++;
            }
        };
    }
    if (!Array.prototype.where) {
        Array.prototype.where = function (f) {
            var i = 0, len = this.length, result = [];
            if (len == 0) return result;
            while (i < len) {
                if (i in this && f.call(this, this[i], i, this)) {
                    result.push(this[i]);
                }
                i++;
            }
            return result;
        };
    }
    //for ie8
    if (!Array.prototype.indexOf) {
        Array.prototype.indexOf = function (elt /*, from*/) {
            var len = this.length >>> 0, from = Number(arguments[1]) || 0;
            from = (from < 0) ? Math.ceil(from) : Math.floor(from);
            if (from < 0) from += len;
            for (; from < len; from++) {
                if (from in this && this[from] === elt)
                    return from;
            }
            return -1;
        };
    }
    if (!Array.prototype.max) {
        Array.prototype.max = function (f) {
            var i = 1, len = this.length, tmp;
            if (len == 0) return null;
            tmp = this[0];
            var flag = f && typeof f == "function", left, right;
            while (i < len) {
                left = flag ? f.call(this, tmp, i - 1, this) : tmp;
                right = flag ? f.call(this, this[i], i, this) : this[i];
                if (i in this && left <= right) {
                    tmp = this[i];
                }
                i++;
            }
            return tmp;
        };
    }
    if (!Array.prototype.min) {
        Array.prototype.min = function (f) {
            var i = 1, len = this.length, tmp;
            if (len == 0) return null;
            tmp = this[0];
            var flag = f && typeof f == "function", left, right;
            while (i < len) {
                left = flag ? f.call(this, tmp, i - 1, this) : tmp;
                right = flag ? f.call(this, this[i], i, this) : this[i];
                if (i in this && left >= right) {
                    tmp = this[i];
                }
                i++;
            }
            return tmp;
        };
    }
    if (!Array.prototype.contains) {
        Array.prototype.contains = function (arg) {
            if (typeof arg != "function") return this.indexOf(arg) >= 0;
            var i = 0, len = this.length;
            if (len == 0) return false;
            while (i < len) {
                if (i in this && arg.call(this, this[i], i, this)) {
                    return true;
                }
                i++;
            }
            return false;
        }
    }
    if (!Array.prototype.remove) {
        Array.prototype.remove = function (f) {
            var len = this.length, i = len - 1, idxs = [];
            if (len == 0) return;
            while (i >= 0) {
                if (i in this && f.call(this, this[i], i, this)) {
                    idxs.push(i);
                }
                i--;
            }
            for (i = 0; i < idxs.length; i++) {
                this.splice(idxs[i], 1);
            }
        }
    }
    if (!Array.prototype.distinct) {
        Array.prototype.distinct = function (arg) {
            var len = this.length, i = 0, result = [];
            if (len == 0) return result;
            while (i < len) {
                var cur = this[i];
                if (i in this && cur) {
                    if (typeof arg == "string" && cur.hasOwnProperty(arg) &&
                        !result.contains(function (r) { return r[arg] == cur[arg]; })) {
                        result.push(cur);
                    } else if (typeof arg == "object" && arg instanceof Array &&
                        !result.contains(function (r) {
                             return arg.all(function (a) { return cur.hasOwnProperty(a) && r[a] == cur[a]; });
                    })) {
                        result.push(cur);
                    }
                }
                i++;
            }
            return result;
        }
    }

    if (!Array.prototype.equal) {
        Array.prototype.equal = function (target) {
            if (!(target instanceof Array)) return false;
            var i = 0, len = this.length;
            if (len != target.length) return false;
            while (i < len) {
                if (this[i] != target[i]) return false;
                i++;
            }
            return true;
        }
    }

    if (!String.prototype.trim) {
        String.prototype.trim = function () {
            return this.replace(/^(\s*)(\S+.*\S+)(\s*)$/, "$2");
        }
    }
    if (!String.prototype.trimLeft) {
        String.prototype.trimLeft = function () {
            return this.replace(/^(\s*)(\S+.*)$/, "$2");
        }
    }
    if (!String.prototype.trimRight) {
        String.prototype.trimRight = function () {
            return this.replace(/^(.*\S+)(\s*)$/, "$1");
        }
    }
    if (!String.prototype.contains) {
        String.prototype.contains = function (val) {
            return this.indexOf(val) >= 0;
        }
    }
    if (!String.prototype.startWith) {
        String.prototype.startWith = function (val, ignoreCase) {
            return ignoreCase ? this.toLowerCase().indexOf(val.toLowerCase()) == 0 : this.indexOf(val) == 0;
        }
    }
    if (!String.prototype.format) {
        String.prototype.format = function (/*arg1,arg2,arg3...*/) {
            if (arguments.length == 0) return this;
            var args = arguments;
            var result = this.replace(/\{(\d)\}/g, function (placeholder, index) {
                return args[parseInt(index, 10)];
            });
            return result;
        }
    }
    //show a string of number in comma separate format
    //eg. "12345" -> "123,45"
    if (!String.prototype.toSeparate) {
        String.prototype.toSeparate = function () {
            var sign = this.indexOf("-") == 0;
            var whole = (sign ? this.replace("-", "") : this).split("."), result = [];
            var intarr = whole[0].split("").reverse(), decimal = whole[1];
            for (var i = 0; i < intarr.length; i++) {
                result.push(intarr[i]);
                if ((i + 1) % 3 == 0 && (i + 1 < intarr.length)) result.push(",");
            }
            return (sign ? "-" : "") + result.reverse().join("") + (decimal ? "." + decimal : "");
        }
    }
    //show a number in comma separate format
    //eg. 12345 -> "123,45"
    if (!Number.prototype.toSeparate) {
        Number.prototype.toSeparate = function () {
            return this.toString(10).toSeparate();
        }
    }
})();

