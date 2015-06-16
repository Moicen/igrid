(function($) {
    "use strict";
    $.fn.igrid = function(options) {
        if (!$(this).is("table")) throw Error("Igrid element must be a table!");
        var guid = $(this).data("guid");
        return cache[guid] ? cache[guid].igrid : new Igrid(this, options);
    }


    var identity = 0, icons = null, cache = {};
    //default options
    var _DEFAULT = {
        cols: [],
        customCol: undefined,
        singleSelect: false,
        multiSelect: false,
        showRowNum: true,
        data: [],
        remote: true,
        head: {
            enable: false
        },
        request: {
            cache: false,
            loadonce: true,
            param: {},
            sord: 1,
            sidx: undefined,
            url: undefined,
            mtype: "POST",
        },
        summation: {
            enable: false,
            data: null
        },
        paginator: {
            paging: true,
            pageSizeList: [10, 20, 50],
            pageSize: 10,
            pageIndex: 1,
            records: 0,
            pageCount: 0
        },
        lang: "en",
        handler: {},
        icons: {
            prefix: "fa",
            sort: "sort",
            sortAsc: "sort-asc",
            sortDesc: "sort-desc",
            plus: "plus",
            minus: "minus",
            popup: "angle-double-up",
            recoil: "angle-double-down",
            sub: "level-up rotate-90"
        },
        subGrid: {
            enable: false,
            options: null
        }
    };


    function genId() {
        var id = identity++,
            prefix;
        do prefix = (((1 + Math.random()) * 0x10000) | 0).toString(16);
        while (cache[prefix + id]);
        return prefix + id;
    }

    //constructor
    function Igrid(ele, options) {
        var guid = genId();
        $(ele).data("guid", guid);
        var panel = $("<div class='igrid igrid-panel'>").insertBefore(ele).append(ele);
        var root = $("<div class='igrid igrid-root'>").insertBefore(panel).append(panel);
        cache[guid] = $.extend(true, {
            guid: guid,
            grid: ele,
            root: root,
            panel: panel,
            igrid: this
        }, _DEFAULT, options);
        init(cache[guid]);
        this.guid = guid;
    }


    Igrid.prototype = {

        version: "1.0.0",
        
        constructor: Igrid,
        
        //Read igrid's option(s)
        getOption: function(key) {
            return key === undefined ? cache[this.guid] : cache[this.guid][key];
        },

        //load data into igrid.
        load: function(data) {
            var opt = cache[this.guid];
            if (data && $.isArray(data)) opt.data = dataClean(data, opt.cols);
            if (opt.paginator.paging) resetPager(configPager(opt));
            reload(opt);
            return opt.igrid;
        },

        //reload
        reload: function(obj) {
            //reload with data/param, reset the pageIndex
            var opt = cache[this.guid];
            if (obj) opt.paginator.pageIndex = 1;

            if ($.isArray(obj)) {
                //obj is array data to be reload
                opt.data = dataClean(obj, opt.cols);
                if (cache[this.guid].paginator.paging)
                    resetPager(configPager(opt));
                reload(opt);
            } else {
                if (opt.remote) {
                    //obj is parameter for remote request
                    if (typeof obj == "object") {
                        opt.request.param = obj;
                    }
                    request(opt);
                }
            }
            return opt.igrid;
        },

        //search
        search: function(param) {
            var opt = cache[this.guid];
            if (!opt.request.cache && opt.remote) return this.reload(param);
            search(opt, param);
            return opt.igrid;
        },

        //update
        update: function(factor, values) {
            var opt = cache[this.guid];
            if (!opt.request.loadonce) return opt.igrid;
            update(opt, factor, values);
            this.refresh();
            return opt.igrid;
        },

        //clear
        clear: function() {
            var opt = cache[this.guid];
            opt.data = [];
            resetPager(configPager(opt));
            reload(opt);
            return opt.igrid;
        },

        //refresh
        refresh: function() {
            reload(cache[this.guid]);
            return cache[this.guid].igrid;
        },

        //showCol
        showCol: function(field) {
            var opt = cache[this.guid];
            columnToggle(opt.grid, field, true);
            return opt.igrid;
        },

        //hideCol
        hideCol: function(field) {
            var opt = cache[this.guid];
            columnToggle(opt.grid, field, false);
            return opt.igrid;
        },

        toggleCol: function(field, flag) {
            var opt = cache[this.guid];
            columnToggle(opt.grid, field, flag);
            return opt.igrid;
        },

        addRowData: function(ridx, row) {
            var opt = cache[this.guid];
            //can not do this with remote data
            if (opt.remote && !opt.request.loadonce) throw Error("Remote data cannot be added here!");

            var len = opt.data ? opt.data.length : 0;
            if (!row && typeof ridx == "object") {
                row = ridx;
                ridx = len + 1;
            }
            if ($.isEmptyObject(row)) {
                throw Error("The argument 'data' is empty.");
            }
            //in case that index is out of range.
            ridx = Math.min(Math.max(ridx, 1), len + 1);
            addRow(opt, ridx, row);
            if (!opt.paginator.paging) {
                reload(opt);
                return opt.igrid;
            }
            var pageIndex = opt.paginator.pageIndex;
            var size = opt.paginator.pageSize * opt.paginator.pageIndex;
            if (ridx > size) {
                pageIndex = Math.ceil(ridx / opt.paginator.pageSize);
                if (pageIndex > opt.paginator.pageCount) {
                    opt.paginator.pageCount++;
                }
            }
            paging(opt, pageIndex);
            return opt.igrid;
        },

        addMultiRowDatas: function(ridx, rows) {
            var opt = cache[this.guid];
            if (!opt.request.loadonce) throw Error("Remote data cannot be added here!");
            var len = cache[this.guid].data ? cache[this.guid].data.length : 0;
            if (!rows && typeof ridx == "object") {
                rows = ridx;
                ridx = len + 1;
            }
            if (!$.isArray(rows)) {
                throw Error("The argument 'rows' must be an array.");
            }
            ridx = Math.min(Math.max(ridx, 1), len + 1);
            addMultiRows(opt, ridx, rows);
            if (!opt.paginator.paging) {
                reload(opt);
                return opt.igrid;
            }
            var pageIndex = opt.paginator.pageIndex;
            var size = opt.paginator.pageSize * opt.paginator.pageIndex;
            ridx += rows.length - 1;
            if (ridx > size) {
                pageIndex = Math.ceil(ridx / opt.paginator.pageSize);
                if (pageIndex > opt.paginator.pageCount) {
                    opt.paginator.pageCount++;
                }
            }
            paging(opt, pageIndex);
            return opt.igrid;
        },

        setRowData: function(ridx, data) {
            if (!data || $.isEmptyObject(data)) {
                throw Error("The argument 'data' is empty.");
            }
            var opt = cache[this.guid];
            var tr = opt.grid.find("tr[data-ridx='" + ridx + "']");
            if (tr.length == 0) {
                throw Error("Row index out of range.");
            }
            setRow(opt, ridx, data);
            reload(opt);
            return opt.igrid;
        },

        getRowData: function(ridx) {
            return readRow(cache[this.guid], ridx);
        },

        delRowData: function(ridx) {
            var opt = cache[this.guid];
            if (ridx > opt.data.length || ridx < 0)
                throw new Error("ridx is out of range.");
            delRow(opt, ridx);
            if (!opt.paginator.paging) {
                reload(opt);
                return opt.igrid;
            }
            paging(opt, opt.paginator.pageIndex);
            return opt.igrid;
        },

        delMultiRowDatas: function(ridxes) {
            var opts = cache[this.guid];
            if (!$.isArray(ridxes)) throw Error("The argument 'ridxes' must be an array.");
            if (ridxes.length == 0) return opts.igrid;
            delMultiRows(opts, ridxes);
            if (!opts.paginator.paging) {
                reload(opts);
                return opts.igrid;
            }
            paging(opts, opts.paginator.pageIndex);
            return opts.igrid;
        },

        getSelectedRow: function() {
            var tr = cache[this.guid].grid.find("tr.selected");
            if (tr.length == 0) {
                return null;
            }
            return readRow(cache[this.guid], parseInt(tr.attr("data-ridx"), 10));
        },

        getSelectedRowIdx: function() {
            var tr = cache[this.guid].grid.find("tr.selected");
            if (tr.length == 0) {
                return undefined;
            }
            return parseInt(tr.attr("data-ridx"), 10);
        },

        setSelectedRowData: function(data) {
            var tr = cache[this.guid].grid.find("tr.selected");
            if (tr.length == 0) {
                throw Error("No row selected.");
            }
            var ridx = parseInt(tr.attr("data-ridx"), 10);
            return this.setRowData(ridx, data);
        },

        delSelctedRow: function() {
            var grid = cache[this.guid].grid,
                tr = grid.find("tr.selected");
            if (tr.length == 0) {
                throw Error("No row selected.");
            }
            tr.each(function() {
                var ridx = parseInt($(this).attr("data-ridx"), 10);
                $(this).remove();
                grid.find("tr[data-ridx]").each(function() {
                    var curIdx = parseInt($(this).attr("data-ridx"), 10);
                    if (curIdx > ridx) {
                        $(this).attr("data-ridx", curIdx - 1);
                        $(this).find("td.ridx").text(curIdx - 1);
                    }
                });
                delRow(cache[this.guid], ridx);
            });

            return cache[this.guid].igrid;
        },

        getMultiSelectedRows: function() {
            var trs = cache[this.guid].grid.find("tr.selected").not(".sum");
            if (trs.length == 0) {
                return null;
            }
            var rows = [];
            for (var i = 0; i < trs.length; i++) {
                rows.push(readRow(cache[this.guid], parseInt($(trs[i]).attr("data-ridx"), 10)));
            }
            return rows;
        },

        getMultiSelectedRowIdxes: function() {
            var trs = cache[this.guid].grid.find("tr.selected").not(".sum");
            var idxes = [];
            for (var i = 0; i < trs.length; i++) {
                idxes.push(parseInt($(trs[i]).attr("data-ridx"), 10));
            }
            return idxes;
        },

        setRowSelected: function(ridx) {
            var opt = cache[this.guid];
            var tr = opt.grid.find("tr[data-ridx='" + ridx + "']");
            if (tr.length == 0) throw Error("Row index out of range.");
            if (!opt.multiSelect) this.resetSelection();
            tr.addClass("selected");
            tr.find(".igrid-check input:checkbox, .igrid-radio input:radio").prop("checked", true);
            var chks = opt.grid.find("tbody input:checked");
            if (chks.length == opt.paginator.pageSize) {
                opt.grid.find("thead input:checkbox").prop("checked", true);
            }
            return opt.igrid;
        },

        setRowUnselected: function(ridx) {
            var opt = cache[this.guid];
            var tr = opt.grid.find("tr[data-ridx='" + ridx + "']");
            if (tr.length == 0) {
                throw Error("Row index out of range.");
            }
            tr.removeClass("selected");
            tr.find(".igrid-check input:checkbox, .igrid-radio input:radio").prop("checked", false);
            var chks = opt.grid.find("tbody input:not(:checked)");
            if (chks.length == opt.paginator.pageSize) {
                opt.grid.find("thead input:checkbox").prop("checked", false);
            }
            return opt.igrid;
        },

        getData: function() {
            if (!this.valid()) {
                warning("you have some wrong data in the grid, please check your input and try again.");
                return null;
            }
            return cache[this.guid].data || [];
        },

        getCurPageData: function() {
            return readCurPage(cache[this.guid]);
        },

        setCell: function(ridx, field, data) {
            var td = cache[this.guid].grid.find("tr[data-ridx='" + ridx + "'] td[data-field='" + field + "']");
            if (td.length == 0) {
                throw Error("Can not find the cell of row[" + ridx + "] column[" + field + "] .");
            }
            td.html(data);
            setCell(cache[this.guid], ridx, field, data);
            return cache[this.guid].igrid;
        },

        getCell: function(ridx, field) {
            var td = cache[this.guid].grid.find("tr[data-ridx='" + ridx + "'] td[data-field='" + field + "']");
            if (td.length == 0) {
                throw Error("Can not find the cell of row[" + ridx + "] column[" + field + "] .");
            }
            return readCell(cache[this.guid], ridx, field);
        },

        editCell: function(ridx, field) {
            var opt = cache[this.guid];
            var td = opt.grid.find("tr[data-ridx='" + ridx + "'] td[data-field='" + field + "']");
            if (td.length == 0) {
                throw Error("Can not find the cell of row[{0}] column[{1}] .".format(ridx, field));
            }
            renderEditCell(td, opt.isWebKit);
            return opt.igrid;
        },

        saveCell: function(ridx, field) {
            var opt = cache[this.guid];
            var td = opt.grid.find("tr[data-ridx='" + ridx + "'] td[data-field='" + field + "']");
            if (td.length == 0) {
                throw Error("Can not find the cell of row[{0}] column[{1}] .".format(ridx, field));
            }
            var input = opt.isWebKit ? td : td.find("[contenteditable]");
            var value = editSave(input, ridx, field, opt);
            if (value === false) return false;
            td.removeClass("editable").html(value).prop("contenteditable", false);
            return opt.igrid;
        },

        saveRow: function(ridx) {
            var opt = cache[this.guid];
            var tr = opt.grid.find("tr[data-ridx='" + ridx + "']");
            if (tr.length == 0) throw Error("Can not find the row[{0}] .".format(ridx));
            tr.find("td.editable").each(function() {
                var input = opt.isWebKit ? $(this) : $(this).find("[contenteditable]");
                var value = editSave(input, ridx, field, opt);
                if (value === false) return false;
                $(this).removeClass("editable").html(value).prop("contenteditable", false);
            });
            return opt.igrid;
        },

        resetSelection: function() {
            var opt = cache[this.guid];
            opt.grid.find("tr.selected").removeClass("selected");
            opt.grid.find(".igrid-check input:checkbox, .igrid-radio input:radio").prop("checked", false);
            return opt.igrid;
        },

        destroy: function() {
            var opt = cache[this.guid];
            opt.grid.off("click", "tbody td").off("dblclick", "tbody td").off("blur", "tbody td")
                .empty().data("guid", undefined).insertBefore(opt.root);
            opt.root.remove();
            $("#igrid-" + this.guid + "-waiting").remove();
            cache[this.guid] = null;
        },

        storeStatus: function(rn) {
            var opts = cache[this.guid];
            var status = {
                url: renderUrl(opts.request.url),
                page: opts.paginator.pageIndex,
                size: opts.paginator.pageSize,
                row: rn,
                param: opts.request.param
            };
            sessionStorage.setItem("igridStatus", JSON.stringify(status));
        },

        valid: function() {
            return cache[this.guid].grid.find(".input-error").length == 0;
        }
    }

    //read data from sessionStorage to restore previous status of igrid.
    function readSession() {
        var status = sessionStorage.igridStatus;
        if (status) status = JSON.parse(status);
        return status;
    }
    //to get full url if you use a simple action name as the url param
    //mostly when you use a MVC framework, you can write just the action name
    //if the action is just in the current controller.
    //and in this case , igrid use the location property to get full url to make request.
    function renderUrl(url) {
        var path;
        if (url && url.indexOf("/") <= 0) {
            path = location.pathname.split("/");
            path.splice(path.length - 1, 1, url);
            path = path.join("/");
        }
        return path || url;
    }
        //check if the given field is valid.
    function fieldVerify(fields, field) {
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].field == field) {
                return true;
            }
        }
        return false;
    }


    function init(options) {
        //check browser, for edit use.
        options.isWebKit = navigator.userAgent.toLowerCase().contains("webkit");
        options = initVerify(options);
        if (options.width) options.root.width(options.width);
        if (options.height) options.grid.parent().height(options.height);
        if (options.head.enable) renderHeader(options);
        if (options.paginator.paging) {
            initPager(configPager(options));
        } else {
            options.paginator.pageSize = Infinity;
        }
        initIcons(options);
        renderTable(options);
        initEvent(options);
    }

    function initIcons(options){
        if(icons) return;
        icons = {};
        var prefix = options.icons.prefix;
        icons.prefix = prefix;
        for(var icon in options.icons){
            if(icon != "prefix"){
                var cls = options.icons[icon].split(" ");
                icons[icon] = cls.select(function(c){ return prefix + "-" + c; }).join(" ");
            }
        }
    }

    function initVerify(options) {
        if (!options) throw Error("init options undefined!");
        if (options.cols.length == 0) throw Error("cols has no element!");
        if (options.singleSelect && options.multiSelect)
            throw Error("singleSelect and multiSelect can not be true at the same time!");
        if (isNaN(parseInt(options.request.sord, 10))) options.request.sord = 1;
        if (!options.request.sidx || !fieldVerify(options.cols, options.request.sidx))
            options.request.sidx = options.cols[0].field;
        if (isNaN(parseInt(options.paginator.pageIndex)) || options.paginator.pageIndex <= 0)
            options.paginator.pageIndex = 1;

        var status = readSession();
        if (status && status.url == renderUrl(options.request.url)) {
            options.paginator.pageIndex = status.page;
            options.paginator.selectedRow = status.row;
            options.request.param = status.param;
            sessionStorage.removeItem("igridStatus");
        }
        return options;
    }

    function initEvent(options) {
        initHeaderEvent(options);
        initTableEvent(options);
        initEditEvent(options);
    }

    function initTableEvent(options) {
        //normal click event on the table cells.
        options.grid.on("click", "tbody td", function() {
            //skip the subgrid row
            if ($(this).parent().hasClass("igrid-sub-tr")) return;
            var tr = $(this).parent(),
                ridx = parseInt(tr.attr("data-ridx"), 10),
                row = options.igrid.getRowData(ridx);

            if (options.multiSelect) {
                var chk = tr.find(".igrid-check input:checkbox"),
                    flag = !chk.prop("checked");
                chk.prop("checked", flag);
                tr.toggleClass("selected", flag);
                selectRow(options, flag, row, ridx);
            } else {
                if (!tr.hasClass("selected")) {
                    tr.parent().find("tr.selected").removeClass("selected");
                    tr.addClass("selected");
                    if (options.singleSelect) {
                        tr.parent().find("tr.selected").find(".igrid-radio input:radio").prop("checked", true);
                        selectRow(options, true, row, ridx);
                    }
                } else {
                    tr.removeClass("selected");
                    if (options.singleSelect) {
                        tr.find(".igrid-radio input:radio").prop("checked", false);
                        selectRow(options, false, row, ridx);
                    }
                }
            }
            //custom cell click handler
            if (typeof options.handler.onCellClick == "function") {
                options.handler.onCellClick.call(null, ridx, tr.hasClass("selected"));
            }

        });

        options.grid.on("click", "tbody td input:radio", function(e) {
            var tr = $(this).parent().parent(),
                ridx = parseInt(tr.attr("data-ridx"), 10),
                row = options.igrid.getRowData(ridx);
            if (!tr.hasClass("selected")) {
                tr.parent().find("tr.selected").removeClass("selected");
                tr.addClass("selected");
                selectRow(options, true, row, ridx);
            } else {
                selectRow(options, false, row, ridx);
            }
            //in case the effect overwrite between this and common cell click event
            e.stopPropagation();
        });

        options.grid.on("click", "tbody td input:checkbox", function(e) {
            var tr = $(this).parent().parent(),
                flag = $(this).prop("checked"),
                ridx = parseInt(tr.attr("data-ridx"), 10),
                row = options.igrid.getRowData(ridx);
            tr.toggleClass("selected", flag);
            selectRow(options, flag, row, ridx);
            //in case the effect overwrite between this and common cell click event
            e.stopPropagation();
        });
        //expand/close the subgrid
        options.grid.on("click", "tbody td.igrid-sub-icon", function() {
            var tr = $(this).parent(),
                trSub = tr.next("tr.igrid-sub-tr"),
                index = $(this).index();
            if (tr.hasClass("open")) {
                tr.removeClass("open");
                $(this).find("i").removeClass(icons.minus).addClass(icons.plus);
                trSub.hide();
            } else {
                tr.addClass("open");
                $(this).find("i").removeClass(icons.plus).addClass(icons.minus);
                if (trSub.length > 0) {
                    trSub.show();
                    return;
                }
                trSub = $("<tr class='igrid-sub-tr'></tr>");
                var arrow = "<td><i class='{0} {1}'></i></td>".format(icons.prefix, icons.sub);
                trSub.append(index == 0 ? arrow : "<td colspan='" + index + "'></td>" + arrow);
                renderSubGrid(tr, trSub, options);
            }
        });
        //click thead to sort
        options.grid.find("thead th.sortable").click(function() {
            $(this).parent().find("th.sortable").not(this).find("i")
                .removeClass(icons.sortAsc + " " + icons.sortDesc)
                .addClass(icons.sort).css({ color: "" });
            var icon = $(this).find("i");
            if (icon.hasClass(icons.sortAsc)) {
                icon.removeClass(icons.sortAsc).addClass(icons.sortDesc);
                options.request.sord = -1;
            } else {
                icon.removeClass(icons.sort + " " + icons.sortDesc).addClass(icons.sortAsc);
                options.request.sord = 1;
            }
            options.request.sidx = $(this).data("sortfield");
            sort(options);
        });
        //click to edit
        options.grid.on("click", ".editable input, .editable select, .editable checkbox", function(e) {
            var tr = $(this).parent().parent();
            if (!tr.hasClass("selected")) {
                tr.parent().find("tr.selected").removeClass("selected");
                tr.addClass("selected");
            }
            e.stopPropagation();
        });

        options.grid.find("thead .igrid-check input:checkbox").click(function() {
            var checked = $(this).prop("checked");
            options.grid.find("tbody .igrid-check input:checkbox").prop("checked", checked);
            options.grid.find("tbody  tr").toggleClass("selected", checked);
            selectAll(options, checked);
        });

        options.grid.find("thead .igrid-radio input:radio").click(function() {
            options.grid.find("tbody .igrid-radio input:radio").prop("checked", false);
            options.grid.find("tbody  tr").removeClass("selected");
        });
        //custom dblclick handler
        if (typeof options.handler.onCellDblClick == "function") {
            options.grid.on("dblclick", "tbody td", function() {
                var tr = $(this).parent(),
                    ridx = parseInt(tr.attr("data-ridx"), 10),
                    row = options.igrid.getRowData(ridx);
                options.handler.onCellDblClick.call(null, row, ridx);
            });
        }
        options.grid.on("click", "thead th.igrid-header-control", function() {
            var header = options.root.find(".igrid-header");
            if (header.is(":visible")) {
                header.hide("slide");
                $(this).find("i").removeClass().addClass(icons.prefix + " " + icons.popup);
            } else {
                header.show("slide");
                $(this).find("i").removeClass().addClass(icons.prefix + " " + icons.recoil);
            }
        });
    }

    function initHeaderEvent(options) {
        options.root.on("click", ".igrid-header input:checkbox", function() {
            columnToggle(options, this.value, $(this).prop("checked"));
        });
    }


    function selectRow(options, flag, row, ridx) {
        if (flag) {
            if (typeof options.handler.onSelectRow == "function") {
                options.handler.onSelectRow.call(null, row, ridx);
            }
        } else {
            if (typeof options.handler.onDeSelectRow == "function") {
                options.handler.onDeSelectRow.call(null, row, ridx);
            }
        }
    }

    function selectAll(options, flag) {
        if (flag) {
            if (options.handler.onSelectAll && typeof options.handler.onSelectAll == "function") {
                options.handler.onSelectAll.call(null, readCurPage(options));
            }
        } else {
            if (options.handler.onDeSelectAll && typeof options.handler.onDeSelectAll == "function") {
                options.handler.onDeSelectAll.call(null, readCurPage(options));
            }
        }
    }

    function subGridPrepare(capacity, options) {
        var lens = [],
            total = 0;
        options.forEach(function(item, index) {
            if (!item.cols) throw Error("subgrid options requires cols !");
            total += lens[index] = item.cols.count(function(c) {
                return !c.hide;
            });
        });
        return lens.select(function(l) {
            return Math.floor((l / total) * capacity);
        });
    }

    function renderSubGrid(tr, trSub, options) {
        if (!$.isArray(options.subGrid.options)) options.subGrid.options = [options.subGrid.options];
        var spans = subGridPrepare(options.cols.count(function(c) {
            return !c.hide;
        }), options.subGrid.options);
        var children = [];
        options.subGrid.options.forEach(function(opt, idx) {
            var subGrid = $("<table></table>").addClass(options.grid.attr("class"));
            var ridx = parseInt(tr.attr("data-ridx"), 10);
            var row = options.igrid.getRowData(ridx);
            if (typeof opt.data == "function") opt.data = opt.data.call(null, row);
            if (typeof opt.paramFn == "function") {
                opt.request.param = opt.paramFn.call(null, row, ridx);
            }
            var td = $("<td colspan='{0}' data-idx='{1}'></td>".format(spans[idx], idx));
            trSub.append(td.append(subGrid));
            children.push({
                grid: subGrid,
                opt: opt
            });
        });
        tr.after(trSub);
        children.forEach(function(child) {
            child.grid.igrid(child.opt);
        });
    }

    //show a pannel to let user choose which cols to be shown.
    function renderHeader(options) {
            var header = "<div class='igrid igrid-header'>{0}</div>";
            var group = "<div class='input-group'><span class='input-group-addon'><strong>显示以下列</strong></span>";
            group += "<div class='checkbox-group multiple-line-group'>";
            options.cols.forEach(function(col) {
                if (!col.fixed) {
                    group += "<label class='checkbox-inline'>" +
                        "<input type='checkbox' value='{0}' {1} />".format(col.field, (!col.hide ? " checked='checked'" : "")) +
                        col.label + "</label>";
                }
            });
            group += "</div></div>";
            options.panel.before(header.format(group));
        }
        //show/hide column
    function columnToggle(options, col, flag) {
        var grid = options.grid,
            cols = options.cols;
        if (typeof col == "string") {
            col = col.split(",");
        }
        if (!$.isArray(col)) throw new Error("col must be an array of string or a string!");
        if (flag) {
            col.forEach(function(c) {
                cols.first(function(co) {
                    return co.field == c;
                }).hide = false;
                grid.find("th[data-field='" + c + "'], td[data-field='" + c + "']").removeClass("hide");
            });
        } else {
            col.forEach(function(c) {
                cols.first(function(co) {
                    return co.field == c;
                }).hide = true;
                grid.find("th[data-field='" + c + "'], td[data-field='" + c + "']").addClass("hide");
            });
        }
        if (options.subGrid.enable) {
            var spans = subGridPrepare(cols.count(function(c) {
                return !c.hide;
            }), options.subGrid.options);
            grid.find("tr.igrid-sub-tr td[data-idx]").each(function() {
                $(this).attr("colspan", spans[$(this).data("idx")]);
            });
        }
        grid.find("tr.subtotal").html(renderSumCell(options, "subtotal", "小计"));
        grid.find("tr.sum").html(renderSumCell(options, "data", "总计"));
    }


    function initEditEvent(options) {
        options.grid.on("blur", "[contenteditable='true']", function() {
            var td = options.isWebKit ? $(this) : $(this).parent(),
                tr = td.parent(),
                field = td.data("field"),
                ridx = parseInt(tr.attr("data-ridx"), 10);
            var col = options.cols.first(function(c) {
                return c.field == field;
            });
            if (col.edit && col.edit.enable) {
                var value = editSave($(this), ridx, field, options);
                $(this).html(format(value, col, ridx, options.igrid.getRowData(ridx)));
            }
        });
        options.grid.on("keydown", "[contenteditable='true']", function(e) {
            if (e.shiftKey || e.ctrlKey) return;
            var td = options.isWebKit ? $(this) : $(this).parent();
            var code = e.which || e.code,
                index = td.data("index"),
                target = null;
            //left
            if (code == 37) target = td.prev("td.editable");
            //right
            if (code == 39) target = td.next("td.editable");
            //down
            if (code == 40) target = td.parent().next("tr").find("td[data-index='" + index + "'].editable");
            //up
            if (code == 38) target = td.parent().prev("tr").find("td[data-index='" + index + "'].editable");
            if (target && target.length > 0) {
                target = options.isWebKit ? target : target.find("[contenteditable='true']");
                target.focus();
            }
        });
    }

    function editSave(input, ridx, field, options) {
        //chrome will add a <span> element to format the content 
        //after we paste some text in a contenteditable element,
        //here we need to remove this span and keep it's text content only.
        if (input.children().length > 0) input.html(input.children()[0].innerHTML);
        var col = options.cols.first(function(r) {
            return r.field == field;
        });
        var value = editVerify(col, field, input.html());
        input.html(value || input.html());
        //custom verify
        if (typeof options.handler.beforeCellSave == "function") {
            value = options.handler.beforeCellSave.call(null, value, field, ridx);
        }
        if (value === false) {
            error(input);
            return false;
        }
        saveInput(options, ridx2Idx(options, ridx), field, value);

        if (typeof options.handler.afterCellSave == "function") {
            options.handler.afterCellSave.call(null, value, field, ridx);
        }
        correct(input);
        return format(value, col, ridx, readRow(options, ridx));
    }

    function editVerify(col, field, input) {
        if (!col.edit) return input;
        var value = input;
        if (col.edit.type == "integer") {
            value = Helper.toInt(value, true);
            if (input && isNaN(value)) {
                warning("please input a integer");
                return false;
            }
        }
        if (col.edit.type == "decimal") {
            value = Helper.toFloat(value, true);
            if (input && isNaN(value)) {
                warning("please input a number");
                return false;
            }
        }
        var rules = col.edit.rules;
        if (rules) {
            if (rules.hasOwnProperty("min") && value < rules.min) {
                warning("{0}c annot be less then {1}".format(col.label, rules.min));
                return false;
            }
            if (rules.hasOwnProperty("max") && value > rules.max) {
                warning("{0} cannot be greeter then {1}".format(col.label, rules.max));
                return false;
            }
        }
        return value;
    }

    function saveInput(options, idx, field, value) {
        options.data[idx][field] = value;
    }

    function error(control) {
        control.addClass("input-error");
    }

    function correct(control) {
        control.removeClass("input-error");
    }

    //render the table
    function renderTable(options) {
        if (options.caption) {
            options.grid.append("<caption>" + options.caption + "</caption>");
        }
        renderThead(options);
        renderData(options);
    }

    function renderData(options) {
        if (options.remote && (!options.data || options.data.length == 0)) {
            request(options);
        } else {
            prepare(options);
            options.grid.append(renderTbody(options));
            //callback when data is load complete
            loadComplete(options);
        }
    }

    function renderThead(options) {
        if (options.cols.length == 0) {
            throw Error("cols has no element!");
        }
        var html = "<thead><tr>",
            flag = options.head.enable,
            headicon = flag ? "<i class='{0} {1}'></i>".format(icons.prefix, icons.popup) : "";

        if (options.showRowNum) {
            html += "<th class='ridx {0}'>".format(flag ? "igrid-header-control" : "");
            if (flag) html += headicon;
            html += "</th>";
        }

        if (options.singleSelect) html += "<th class='igrid-radio'><input type='radio' value='none' /></th>";

        if (options.multiSelect) html += "<th class='igrid-check'><input type='checkbox' value='all' /></th>";

        if (options.subGrid.enable) html += "<th class='igrid-sub-icon'></th>";

        html += renderTitles(options);

        if (options.customCol) {
            html += ("<th {0}>" + options.customCol.label + "</th>").format(options.customCol.width ?
                "style='width:{0}px;'".format(options.customCol.width) : "");
        }
        html += "</tr></thead>";
        options.grid.append(html);
    }

    function renderTitles(options) {
        var html = "";
        for (var i = 0; i < options.cols.length; i++) {
            var col = options.cols[i],
                style = "",
                cls = "",
                data = "",
                children = col.label,
                th = "<th data-field='{0}' class='{1}' style='{2}' {3}>{4}</th>";
            if (col.hide) cls += " hide ";
            if (col.width) style += "width:" + col.width + "px;";
            if (col.sortable) {
                cls += " sortable ";
                data += "data-sortfield='" + (col.sortfield || col.field) + "'";
                var sort = options.request.sidx == col.field ?
                    (options.request.sord > 0 ? icons.sortAsc : icons.sortDesc) : icons.sort; 
                children += "<i class='{0} {1}'></i>".format(icons.prefix, sort);
            }
            html += th.format(col.field, cls, style, data, children);
        }
        return html;
    }

    function renderTbody(options) {
        var tbody = $("<tbody>"),
            list = options.data,
            ridx = options.request.loadonce ? options.paginator.pageSize * (options.paginator.pageIndex - 1) + 1 : 1; /*行号起始值*/
        if (options.request.loadonce) {
            //if page is done in local, splice current page data
            if (options.paginator.records > options.paginator.pageSize) {
                var start = ridx - 1;
                var end = options.paginator.pageSize * options.paginator.pageIndex;
                list = list.slice(start, Math.min(end, options.paginator.records));
            } else {
                ridx = 1;
            }
        }
        if ($.isArray(list) && list.length > 0) {
            for (var i = 0; i < list.length; i++) {
                tbody.append(renderRow(options, ridx++, list[i]));
            }
        }
        if (options.summation.enable) {
            subtotal(options, list);
            tbody.append(renderSubtotalRow(options) + renderSumRow(options));
        }
        return tbody;
    }

    function renderRow(options, ridx, rowData) {
        var tr = $("<tr>").attr("data-ridx", ridx);

        if (options.showRowNum) tr.append($("<td class='ridx'>").text(getRowNum(options, ridx)));
        if (options.singleSelect) tr.append("<td class='igrid-radio'><input type='radio' value='" + ridx + "' /></td>");
        if (options.multiSelect) tr.append("<td class='igrid-check'><input type='checkbox' value='" + ridx + "' /></td>");
        if (options.subGrid.enable) tr.append("<td class='igrid-sub-icon'><i class='{0} {1}'></i></td>".format(icons.prefix, icons.plus));

        for (var i = 0; i < options.cols.length; i++) {
            tr.append(renderCell(options.cols[i], ridx, rowData, options.isWebKit));
        }

        if (options.customCol) tr.append(renderCustomCell(options.customCol, ridx, rowData));
        if (options.paginator.selectedRow == ridx) {
            tr.addClass("selected");
            tr.find(".igrid-radio input:radio, .igrid-check input:checkbox").prop("checked", true);
            delete options.paginator.selectedRow;
        }
        return tr;
    }

    //when you need to show summation data.
    function renderSubtotalRow(options) {
        return "<tr class='subtotal'>{0}</tr>".format(renderSumCell(options, "subtotal", "小计"));
    }

    function renderSumRow(options) {
        return "<tr class='sum'>{0}</tr>".format(renderSumCell(options, "data", "总计"));
    }

    function renderSumCell(options, name, title) {
        var html = "",
            first = null,
            span = 0,
            len = options.cols.length;
        if (!options.summation[name]) return null;
        if (options.showRowNum) span++;
        if (options.singleSelect) span++;
        if (options.multiSelect) span++;
        if (options.subGrid.enable) span++;
        for (var i = 0; i < len; i++) {
            var col = options.cols[i];
            if (col.hide) continue;
            span++;
            if (col.sum) {
                if (!first) {
                    first = "<td colspan='{0}'>{1}：</td>".format(span - 1, title);
                    html += first;
                }
                var val = options.summation[name][col.field];
                if (col.format == "separate") val = val.toSeparate();
                else if (col.format == "money") val = Igrid.ToDecimalString(val).toSeparate();
                html += "<td class='{0}'>{1}</td>".format(col.align, val);
            } else {
                if (first)
                    html += "<td></td>";
            }
        }
        return html;
    }

    function renderCell(col, ridx, rowData, isWebKit) {
        var td = $("<td>").attr("data-field", col.field),
            value = rowData[col.field];
        var content = format(value, col, ridx, rowData);
        if (col.highlight) highlight(td, value, col.highlight, ridx, rowData);
        decorateCell(td, content, col, isWebKit);
        return td;
    }

    function renderCustomCell(customCol, ridx, rowData) {
        var td = $("<td>"),
            content;
        if (typeof customCol.content == "function")
            content = customCol.content.call(null, ridx, rowData);
        else content = customCol.content;

        if ($.isArray(content)) content.forEach(function(c) {
            td.append(c);
        });
        else td.html(content === null || content === undefined ? "" : content);
        return td;
    }

    function decorateCell(td, content, col, isWebKit) {
        if (col.format == "img") td.addClass("img");
        if (col.hide) td.addClass("hide");
        if (col.align) td.addClass(col.align);
        if ($.isArray(content))
            content.forEach(function(v) {
                td.append(v);
            });
        else td.append(content);
        if (col.edit && col.edit.enable) {
            renderEditCell(td, isWebKit);
        }
    }

    function renderEditCell(td, isWebKit) {
        td.addClass("editable");
        var content = td.html();
        if (!isWebKit) {
            td.html("<div contenteditable='true'>{0}</div>".format(content));
            td.find("div[contenteditable]").focus();
        } else {
            td.prop("contenteditable", true).focus();
        }
    }

    function format(value, col, ridx, rowData) {
        switch (col.format) {
            case "separate":
                if (typeof col.formatter == "function") {
                    return col.formatter.call(null, value, rowData, ridx);
                }
                return value.toSeparate();
            case "money":
                if (typeof col.formatter == "function") {
                    return col.formatter.call(null, value, rowData, ridx);
                }
                return Helper.toMoney(value).toSeparate();
            case "select":
                if (typeof col.formatter != "object") {
                    throw Error("The formatter for select must be object!");
                }
                return col.formatter[value];
            case "checkbox":
                return "<input type='checkbox' disabled='disabled' {0} />".format(value ? "checked='checked'" : "");
            case "date":
                return Helper.formatDate(value, col.formatter);
            case "link":
                var url;
                if (typeof col.formatter == "string") {
                    url = col.formatter;
                } else if (typeof col.formatter == "function") {
                    url = col.formatter.call(null, value, rowData, ridx);
                } else {
                    throw Error("The formatter for link must be a string or a function which return a string !");
                }
                if (url && !(url instanceof $) && !/^<\s*(\S+)(\s[^>]*)?>[\s\S]*<\s*\/\1\s*>$/.test(url)) {
                    url = "<a href='" + url + "' data-ridx='" + ridx + "'>" + value + "</a>";
                }
                return url;
            case "img":
                return col.formatter.call(null, rowData);
            case "custom":
                if (typeof col.formatter == "function") {
                    value = col.formatter.call(null, value, rowData, ridx);
                }
                return value;
            case "percent":
                if (typeof col.formatter == "function") {
                    value = col.formatter.call(null, value, rowData, ridx);
                } else {
                    value = parseFloat(col.formatter ? value * 100 : value).toFixed(2) + "%";
                }
                return value;
            default:
                if (typeof col.formatter == "function") {
                    value = col.formatter.call(null, value, rowData, ridx);
                }
                if (typeof value == "string") {
                    value = value.replace(/[\b\f\n\r\t\v]/g, " ");
                }
                return (value === undefined || value === null) ? "" : value;

        }
    }

    function highlight(td, value, hl, ridx, rowData) {
        var color = "red";
        if (hl && typeof hl == "object") {
            if (hl.factor && typeof hl.factor != "function") throw Error("factor of highlight must be a function!");
            if (typeof hl.factor == "function" && !hl.factor.call(null, value, rowData, ridx)) return;
            color = hl.color || color;
            if (typeof color == "function") color = color.call(null, value, rowData, ridx);
        }
        td.css("color", color);
    }

    function getRowNum(options, ridx) {
        return options.request.loadonce ? ridx : options.paginator.pageSize * (options.paginator.pageIndex - 1) + ridx;
    }

    function sum(opt, data) {
        if (!opt.request.loadonce && data.summation) {
            opt.summation.data = data.summation;
            return;
        }
        if (opt.request.loadonce) {
            var summation = {};
            opt.cols.forEach(function(col) {
                if (col.sum) {
                    summation[col.field] = opt.data.sum(function(row) {
                        return Helper.toFloat(row[col.field]);
                    });
                }
            });
            opt.summation.data = summation;
        }
    }

    function subtotal(opt, list) {
        var result = {};
        opt.cols.forEach(function(col) {
            if (col.sum) {
                result[col.field] = list.sum(function(row) {
                    return Helper.toFloat(row[col.field]);
                });
            }
        });
        opt.summation.subtotal = result;
    }


    function initPager(options) {
        if (!options) return;
        renderPager(options);
        initPaging(options);
    }

    function configPager(options, data) {
        if (!options.paginator.paging) return false;
        if (!options.paginator.pageSizeList.contains(options.paginator.pageSize)) {
            options.paginator.pageSize = options.paginator.pageSizeList[0];
        }
        data = data || options.data;
        if (options.request.loadonce) {
            if (data) {
                options.paginator.records = data.length;
                var module = options.paginator.records % options.paginator.pageSize;
                options.paginator.pageCount = module == 0 ? options.paginator.records / options.paginator.pageSize : Math.floor(options.paginator.records / options.paginator.pageSize) + 1;
                options.paginator.pageIndex = Math.max(Math.min(options.paginator.pageIndex, options.paginator.pageCount), 1);
            }
        } else {
            if (data) {
                options.paginator.records = data.records || 0;
                options.paginator.pageCount = data.pageCount || 0;
                data = data.list || [];
            }
        }
        options.data = data;
        return options;
    }

    function resetPager(options) {
        if (!options) return;
        options.root.find(".igrid-paginator").remove();
        initPager(options);
    }

    function renderPager(options) {
        var left = renderPagerLeft(options.paginator, options.lang);
        var right = renderPagerRight(options.paginator, options.lang);
        var paginator = "<div class='igrid igrid-paginator clearfix'>{0}</div>".format(left + right);
        options.root.append(paginator);
    }

    function renderPagerLeft(pg, lang) {
        return "<div class='igrid-paginator-left'>" + renderSize(pg.pageSizeList, pg.pageSize, lang) + "</div>";
    }

    function renderPagerRight(pg, lang) {
        return "<div class='igrid-paginator-right'>{0}{1}{2}</div>".format(renderInfo(pg, lang), renderLink(pg, lang), renderJump(pg, lang));
    }

    function initPaging(options) {
        //page size change event
        options.root.find(".igrid-paginator .page-size").change(function() {
            options.paginator.pageSize = parseInt($(this).val(), 10);
            paging(options, 1);
        });
        options.root.find(".igrid-paginator .page-number").keydown(function(e) {
            if (e.which == 13 || e.keyCode == 13) {
                var index = parseInt(this.innerHTML, 10);
                if (isNaN(index)) index = 1;
                paging(options, index);
            }
        });
        options.root.find(".igrid-paginator .page-number-btn").click(function() {
            var index = parseInt(options.root.find(".igrid-paginator .page-number").html(), 10);
            if (isNaN(index)) index = 1;
            paging(options, index);
        });
        options.root.find(".igrid-paginator a[data-page-number]").not(".disabled").click(function() {
            var target = $(this).data("page-number"),
                index;
            switch (target) {
                case "first":
                    index = 1;
                    break;
                case "prev":
                    index = options.paginator.pageIndex - 1;
                    break;
                case "next":
                    index = options.paginator.pageIndex + 1;
                    break;
                case "last":
                    index = options.paginator.pageCount;
                    break;
                default:
                    index = parseInt(target, 10);
                    break;
            }
            if (index == options.paginator.pageIndex) return;
            paging(options, index);
        });

    }

    function paging(options, index) {
            options.paginator.pageIndex = Math.min(Math.max(1, index), options.paginator.pageCount);

            if (options.request.loadonce) {
                reload(options);
                resetPager(configPager(options));
            } else {
                request(options);
            }
        }
        //render page size control
    function renderSize(sizes, cur, lang) {
            var select = "<select class='page-size'>";
            sizes.forEach(function(size) {
                select += "<option value='{0}' {1} >{0}</option>".format(size + locale("unit", lang), size == cur ? "selected='selected'" : "");
            });
            select += "</select>";
            return select;
        }
        //render page info
    function renderInfo(pg, lang) {
            return "<span class='static-control'>{0},{1}</span>"
                .format(locale("total", lang).format("<strong>" + pg.pageCount + "</strong>", "<strong>" + pg.records + "</strong>"), 
                    locale("current", lang).format("<strong>" + pg.pageIndex + "</strong>"));
        }
        //render page link
    function renderLink(pg, lang) {
        var pager = "<span class='pagination'>";
        if (pg.pageCount > 0) {
            var first = "<a href='javascript:void(0);' data-page-number='first' {0}>"+ locale("first", lang) + "</a>";
            var prev = "<a href='javascript:void(0);' data-page-number='prev' {0}>" + locale("prev", lang) + "</a>";
            pager += (first + prev).format(pg.pageIndex == 1 ? "class='disabled'" : "");
            var next = "<a href='javascript:void(0);' data-page-number='next' {0}>" + locale("next", lang) + "</a>";
            var last = "<a href='javascript:void(0);' data-page-number='last' {0}>" + locale("last", lang) + "</a>";
            pager += (next + last).format(pg.pageIndex == pg.pageCount ? "class='disabled'" : "");
        }
        return pager + "</span>";
    }

    function renderJump(pg, lang) {
        var jump = "<span contenteditable='true' class='page-number'>" + pg.pageIndex + "</span><button type='button' class='page-number-btn btn'>GO</button>";
        return jump;
    }

    function request(options) {
        mask(options);
        var param = $.extend(options.request.param, {
            sord: options.request.sord,
            sidx: options.request.sidx || options.cols[0].field
        });
        if (options.paginator.paging && !options.request.loadonce) {
            param.pageIndex = options.paginator.pageIndex;
            param.pageSize = options.paginator.pageSize;
        }
        $.ajax({
            url: options.request.url,
            data: param,
            type: options.request.mtype,
            contentType: "application/x-www-form-urlencoded; charset=UTF-8",
            dataType: "json"
        }).done(function(data) {
            data = parse(data);
            if (data.Error) {
                warning(data.Message);
                return;
            }
            prepare(options, data);
            reload(options);
        }).fail(function(result) {
            var err = result.responseJSON;
            warning(err ? err.Message : "请求失败！");
        }).always(function() {
            unmask(options);
        });
    }

    function parse(data) {
        if (typeof data == "string") {
            try {
                data = JSON.parse(data);
            } catch (err) {
                try {
                    data = JSON.parse(ctrlEscape(data));
                } catch (e) {
                    throw Error("An error occured when data was parsed to json.");
                }
            }
        }
        return data || [];
    }

    function prepare(options, data) {
        data = data || options.data;
        if (data.list) {
            data.list = dataClean(data.list, options.cols);
        } else {
            data = dataSort(dataClean(data, options.cols), options.request.sord, options.request.sidx);
        }
        if (options.paginator.paging) {
            resetPager(configPager(options, data));
        } else {
            options.data = data;
        }
        if (options.summation.enable) sum(options, data);
        if (options.request.cache || !options.remote) options.Storage = data;
        if (typeof options.handler.onAsyncComplete == "function") {
            options.handler.onAsyncComplete.call(null, data);
        }
    }
    function loadComplete(options){
        if (typeof options.handler.onLoadComplete == "function") {
            var start, end, pg = options.paginator;
            if (options.request.loadonce) {
                start = pg.pageSize * (pg.pageIndex - 1) + 1;
                end = Math.min(pg.records, pg.pageSize * pg.pageIndex);
            } else {
                start = 1;
                var pageEnd = pg.pageIndex * pg.pageSize;
                if (pageEnd > pg.records) {
                    end = pg.records % pg.pageSize;
                } else {
                    end = pg.pageSize;
                }
            }
            options.handler.onLoadComplete.call(null, options.data.slice(0), start, end);
        }
    }
    function reload(options) {
        options.grid.find("thead .igrid-check input:checkbox, thead .igrid-radio input:radio").prop("checked", false);
        options.grid.find("tbody").remove();
        options.grid.find("thead").after(renderTbody(options));
        loadComplete(options);
    }
        //local search
    function search(options, param) {
        var data = options.Storage.where(function(item) {
            return compare(item, param, options.cols);
        });
        data = dataClean(data, options.cols)
            .sort(function(x, y) {
                var sidx = options.request.sidx,
                    sord = options.request.sord;
                if (typeof sord == "string") sord = sord == "ASC" ? 1 : -1;
                return sord > 0 ? x[sidx] > y[sidx] : x[sidx] < y[sidx];
            });
        resetPager(configPager(options, data));
        reload(options);
    }

    function compare(data, param, cols) {
        if ($.isEmptyObject(param)) return true;
        var flag = true;
        for (var p in param) {
            var value = param[p];
            if (value) {
                if (p == "keyword") {
                    var kf = false;
                    for (var prop in data) {
                        var col = cols.first(function(c) {
                            return c.field == prop;
                        });
                        if (!col || col.hide) continue;
                        kf = kf || (typeof data[prop] == "string" && data[prop].contains(value));
                    }
                    flag = flag && kf;
                } else {
                    if (!data.hasOwnProperty(p)) continue;
                    var val = data[p] || "";
                    //if a field is searched with multiple value one time
                    if ($.isArray(value)) {
                        flag = flag && value.contains(val.toString());

                    } else {
                        flag = flag && (val.toString() == value);
                    }
                }
            }

        }
        return flag;
    }

    function update(opt, factor, values) {
        if (opt.request.cache) updateData(opt.Storage, factor, values);
        updateData(opt.data, factor, values);
        if (typeof opt.handler.onUpdate == "function") {
            opt.handler.onUpdate.call(null, opt.Storage || opt.data);
        }
    }

    function updateData(data, factor, values) {
        data.forEach(function(item) {
            if (factor.call(null, item)) {
                for (var prop in values) {
                    if (item.hasOwnProperty(prop))
                        item[prop] = values[prop];
                }
            }
        });
    }

    function readCurPage(options) {
        if (options.request.loadonce) {
            var start = options.paginator.pageSize * (options.paginator.pageIndex - 1);
            var end = options.paginator.pageSize * options.paginator.pageIndex;
            end = Math.min(end, options.paginator.records);
            return options.data.slice(start, end);
        } else {
            return options.data.slice(0);
        }
    }

    function readRow(options, ridx) {
        var idx = ridx2Idx(options, ridx);
        return options.data[idx];
    }

    function readCell(options, ridx, col) {
        var idx = ridx2Idx(options, ridx);
        return options.data[idx][col];
    }

    function setRow(options, ridx, row) {
        var idx = ridx2Idx(options, ridx);
        options.data[idx] = rowClean(row, options.cols);
    }

    function setCell(options, ridx, col, data) {
        var idx = ridx2Idx(options, ridx);
        if (fieldVerify(options.cols, col)) {
            options.data[idx][col] = data;
        }
    }

    function delRow(options, ridx) {
        var idx = ridx2Idx(options, ridx);
        options.data.splice(idx, 1);
        configPager(options);
    }

    function addRow(options, ridx, row) {
        var idx = ridx2Idx(options, ridx);
        if (!options.data) {
            options.data = [];
        }
        options.data.splice(idx, 0, rowClean(row, options.cols));
        configPager(options);
    }

    function delMultiRows(options, ridxes) {
        ridxes.sort(function(p, n) {
            return n - p;
        }).forEach(function(ridx) {
            delRow(options, ridx);
        });
    }

    function addMultiRows(options, ridx, rows) {
        var idx = ridx2Idx(options, ridx);
        if (!options.data) {
            options.data = rows;
        } else {
            rows.forEach(function(row, i) {
                options.data.splice(idx + i, 0, rowClean(row, options.cols));
            });
        }
        configPager(options);
    }

    //get the array index with the row number
    function ridx2Idx(options, ridx) {
        var idx = options.request.loadonce ? ridx - 1 : (ridx - 1) % options.paginator.pageSize;
        return Math.min(Math.max(idx, 0), options.data ? options.data.length : 0);
    }

    function sort(options) {
        if (options.remote && !options.request.loadonce) {
            options.igrid.reload();
            return;
        }
        var sidx = options.request.sidx,
            sord = options.request.sord,
            data = dataSort(options.data, sord, sidx);
        resetPager(configPager(options, data));
        reload(options);
    }

    function dataSort(data, sord, sidx) {
        return data.sort(function(x, y) {
            if (typeof sord == "string") sord = sord == "ASC" ? 1 : -1;
            return sord * (x[sidx] > y[sidx] ? 1 : -1);
        });
    }

    //clean the undefined columns
    // you can return as much columns as you want,
    // while igrid only keep these been defined in the options.cols.
    function dataClean(data, cols) {
        for (var i = 0; i < data.length; i++) {
            for (var p in data[i]) {
                if (!fieldVerify(cols, p) && !$.isArray(data[i][p])) {
                    delete data[i][p];
                }
            }
            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];
                if (!col.nondata && !data[i].hasOwnProperty(col.field)) {
                    if (col.defaultVal !== undefined && col.defaultVal !== null) {
                        data[i][col.field] = col.defaultVal;
                    } else {
                        data[i][col.field] = "";
                    }
                }
                if (col.format == "date") {
                    data[i][col.field] = Helper.formatDate(data[i][col.field], col.formatter);
                }
            }
        }
        return data;
    }

    function rowClean(row, cols) {
        for (var p in row) {
            if (!fieldVerify(cols, p) && !$.isArray(row[p])) {
                delete row[p];
            }
        }
        return row;
    }

    function warning(msg) {
        if (window.Igrid) {
            Igrid.Alert(msg, "error");
        } else {
            alert(msg);
        }
    }
    //show a modal mask when waiting for response
    function mask(options) {
        var id = "igrid-" + options.guid + "-mask",
            root = options.root;
        var div = root.next("#" + id),
            height = root.outerHeight();
        var margin = Helper.toInt(root.css("margin-top")) + Helper.toInt(root.css("margin-bottom"));
        var style = "width:" + root.outerWidth() + "px;height:" + (height + margin) + "px;left:" +
            root.position().left + "px;top:" + root.position().top + "px;";
        if (div.length > 0) {
            div.show();
            div.attr("style", style);
            return;
        }
        div = $("<div id='" + id + "' class='grid-mask'>").attr("style", style);
        root.after(div);
    }
    //remove the modal mask when response received.∑
    function unmask(options) {
        options.root.next("#igrid-" + options.guid + "-mask").hide();
    }

    function ctrlEscape(str) {
        return str.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\v/g, "\\v").replace(/\f/g, "\\f");
    }
    

    var Helper = {
        //Convert to integer
        toInt: function(val, raw) {
            if (!val) return 0;
            if (typeof val == "string" && val.contains(",")) {
                val = val.replace(",", "");
            }
            var re = parseInt(val, 10);
            return !raw && isNaN(re) ? 0 : re;
        },

        //Conver to float
        toFloat: function(val, raw) {
            if (!val) return 0.00;
            if (typeof val == "string" && val.contains(",")) {
                val = val.replace(",", "");
            }
            var re = parseFloat(val);
            return !raw && isNaN(re) ? 0 : re;
        },

        //Convert to "###.##" format. without currency sign.
        toMoney: function(val, fraction) {
            return this.toFloat(val).toFixed(fraction || 2);
        },

        // format date
        formatDate: function(date, format) {
            if (!date) return "";
            if (typeof date == "string") {
                if (date.indexOf("0001") == 0) return "";
                date = date.replace(/\-/g, "\/").replace("T", " ").split(".")[0];
            }
            try {
                date = new Date(date);
            } catch (err) {
                throw err;
            }
            var year = date.getYear(),
                fullYear = date.getFullYear(),
                month = date.getMonth() + 1,
                day = date.getDate(),
                hour = date.getHours(),
                minute = date.getMinutes(),
                second = date.getSeconds();
            var result = "";
            switch (format) {
                case "yyyy-MM-dd":
                    result = fullYear + "-" + (month >= 10 ? month : "0" + month) + "-" + (day >= 10 ? day : "0" + day);
                    break;
                case "yy-MM-dd":
                    result = year + "-" + (month >= 10 ? month : "0" + month) + "-" + (day >= 10 ? day : "0" + day);
                    break;
                case "yyyy/MM/dd":
                    result = fullYear + "/" + (month >= 10 ? month : "0" + month) + "/" + (day >= 10 ? day : "0" + day);
                    break;
                case "yy/MM/dd":
                    result = year + "/" + (month >= 10 ? month : "0" + month) + "/" + (day >= 10 ? day : "0" + day);
                    break;
                case "yyyy/MM/dd hh:mm:ss":
                    result = fullYear + "/" + (month >= 10 ? month : "0" + month) + "/" + (day >= 10 ? day : "0" + day) + " " +
                        (hour >= 10 ? hour : "0" + hour) + ":" + (minute >= 10 ? minute : "0" + minute) + ":" + (second >= 10 ? second : "0" + second);
                    break;
                case "yy/MM/dd hh:mm:ss":
                    result = year + "/" + (month >= 10 ? month : "0" + month) + "/" + (day >= 10 ? day : "0" + day) + " " +
                        (hour >= 10 ? hour : "0" + hour) + ":" + (minute >= 10 ? minute : "0" + minute) + ":" + (second >= 10 ? second : "0" + second);
                    break;
                case "yy-MM-dd hh:mm:ss":
                    result = year + "-" + (month >= 10 ? month : "0" + month) + "-" + (day >= 10 ? day : "0" + day) + " " +
                        (hour >= 10 ? hour : "0" + hour) + ":" + (minute >= 10 ? minute : "0" + minute) + ":" + (second >= 10 ? second : "0" + second);
                    break;
                case "yyyy-MM-dd HH:mm:ss":
                default:
                    result = fullYear + "-" + (month >= 10 ? month : "0" + month) + "-" + (day >= 10 ? day : "0" + day) + " " +
                        (hour >= 10 ? hour : "0" + hour) + ":" + (minute >= 10 ? minute : "0" + minute) + ":" + (second >= 10 ? second : "0" + second);
                    break;
            }
            return result;
        }
    }

    var langs = {
        "zh_CN": {
            "unit": "条",
            "total": "共{0}页，｛1｝条",
            "current": "当前第｛0｝页",
            "first": "首页",
            "last": "尾页",
            "prev": "上一页",
            "next": "下一页",
            "subtotal": "小计",
            "summation": "合计"
        },
        "en": {
            "unit": "",
            "total": "total {0} pages, {1} records",
            "current": "page {0}",
            "first": "first",
            "last": "last",
            "prev": "prev",
            "next": "next",
            "subtotal": "subtotal",
            "summation": "summation"
        }
    };

    var locale = function(key, type) {
        return langs[type][key]
    }


    //syntax sugar
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

})(jQuery);
