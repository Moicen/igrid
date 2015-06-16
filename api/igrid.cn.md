Igrid API
=========
Igrid是一款轻量级的jQuery数据操作插件。
它为指定的`<table>`元素添加修饰以便于显示和操作多行数据，支持点击表头排序、分页、显示子表格等。
开发人员可以使用高级配置为用户提供更多自定义和更强大的操作功能。

[TOC]

## 使用示例 ##

* 普通使用
    ```javascript
	//定义初始化配置项
	var options = {
            cols: [
                { field: "Id", label: "Id", hide: true },
                { field: "Code", label: "Code", width: 120, sortable: true, format: "link", formatter: function (val, row) { return "Detail?id=" + row.Id; } },
                { field: "InType", label: "InType", width: 80, format: "select", formatter: { "1": "Produce", "2": "Purchase", "3": "Return"} },
                { field: "Status", label: "Status", width: 80, format: "checkbox" },
                { field: "Quantity", label: "Quantity", align: "right", edit: { enable: true, type: "integer" }, width: 100 }
                { field: "CreateTime", label: "CreateTime", format: "date", formatter: "yyyy-MM-dd HH:mm:ss" sortable: true, width: 100 },
                { field: "Action", label: "Action", nondata: true, width: 100 }
            ],
            request: {
                url: "Query",
                sidx: "CreateTime",
                sord: -1,
                loadonce: false
            }
    	};
    //初始化<table>元素为Igrid对象.
	var igrid = $("#list").igrid(options);
    ```

* 当数据加载完成后添加一列自定义的操作列

	```javascript
	handler: {
        onLoadComplete: function (data, start, end) {
            var edit, del;
            for (var i = start - 1; i <= end - 1; i++) {
                var row = data[i];
                edit = "<a class='btn btn-theme btn-sm' title='edit' data-toggle='tooltip' data-placement='top'" 
                	 + " href='Update?id=" + row.Id + "'><i class='fa fa-pencil'></i></a>";
              	del = "<a class='btn btn-theme btn-sm' title='delete' data-toggle='tooltip' data-placement='top' "
                    + " onclick='Delete(" + row.Id + ")' ><i class='fa fa-trash-o'></i></a>";
                igrid.setCell(i + 1, "Action", edit + del);
            }
        }
    }
	```

* 使用`customCol`属性初始化用于自定义操作的列

	```javascript
	customCol: {
        label: "Action",
        width: 50,
        content: function (ridx, rowData) {
            var del = $("<button class='btn btn-theme btn-sm' type='button' title='delete'><i class='fa fa-trash-o'></i></button>").tooltip().click(function (e) {
	                e.stopPropagation();
	                grid.delRowData(ridx);
                });
            return [del];
        }
    }
	```

* 在行数据保存前进行校验 

    ```javascript
	handler: {
        beforeCellSave: function (value, field, ridx) {
            if (!value && value !== 0) {
                VOG.Alert("请输入入库数量！", "warning");
                return false;
            }
            if (value < 0) {
                VOG.Alert("数量必须大于0！", "warning");
                return false;
            }
            return value;
        }
    }
    ```

* 使用子表格(`subGrid`)为每行显示更多明细数据 

	```javascript
	subGrid: {
        enable: true,
        options: {
            cols: [
                { field: "ColorCode", label: "ColorCode", width: 80 },
                { field: "ColorName", label: "ColorName", width: 100 },
                { field: "SizeNumber", label: "SizeNumber", width: 80 },
                { field: "SizeName", label: "SizeName", width: 100 },
                { field: "BarCode", label: "BarCode", width: 150 },
                { field: "Quantity", label: "Quantity", align: "right", width: 100 }
            ],
            paginator: { paging: false },
            request: {
                url: "GetItems",
                sidx: "StyleNo",
                sord: -1
            },
            paramFn: function(row) {
            	// 使用主表格的行数据生成子表格的远程请求参数
                return { orderId: row.Id };
            }
        }
    }
	```


## 参数配置 ##

###### 全局配置 ######

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|    `cols`     |  `Array`  |      N/A      | 表格中将要显示的列数据。完整的列配置项参见下方。 |
|  `customCol`  | `Object`  |    `null`     | 用于提供编辑或删除等自定义操作的列，完整配置项参见下方。|
| `singleSelect` | `Boolean` |   `false`    | 是否在表格前方显示单选(`radio`)列。选择操作只针对当前页，不能与`multiSelect`同时使用。|
| `multiSelect` | `Boolean` |    `false`    | 是否在表格前方显示复选(`checkbox`)列。选择操作只针对当前页，不能与`singleSelect`同时使用。|
| `showRowNum`  | `Boolean` |    `false`    | 是否显示行号列。 |
|   `remote`    | `Boolean` |    `true`     | 表格数据是否从远程获得。如果设为`true`，需与`request`属性同时使用，`data`属性可以省略。如果设为`false`，必须同时设置`data`属性。 |
|   `data`      |  `Array`  |    `null`     | 使用本地模式时(即`remote`为`false`)，将要放在表格中的数据 |

###### 列配置 ######
`cols`属性定义了将要在表格中显示的列。

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|    `field`    |  `String` |      N/A      | 该列的字段名 |
|    `label`    |  `String` |      N/A      | 该列的表头，主要用于供非英语开发者为用户提供更友好的显示信息。|
|    `hide`     | `Boolean` |    `false`    | 设为`true`是将隐藏该列。|
|   `sortable`  | `Boolean` |    `false`    | 设为`true`以使该列可以被点击表头来排序。 |
|  `sortfield`  |  `String` |   undefined   | 定义点击该列表头进行排序时，远程请求的排序字段（即`request`的`sidx`属性），默认使用该列的`field`属性。 |
|    `align`    |  `String` |    `center`   | 定义该列数据的水平排列方式，默认居中|
|    `width`    |  `Number` |      N/A      | 该列的宽度(像素px值)，默认自动分配。|
|   `format`    |  `String` |      N/A      | 该列的格式化方式，当前可用值为：["select", "checkbox", "date", "link", "img", "custom"]. 与`formatter`属性配合使用以实现更强大的格式化功能。|
|  `formatter`  | `String,Object,Function` | N/A | 用于自定义格式化方式，一般与`format`属性配合使用。当`format`是"select"时，`formatter`应当为`Object`或者返回`Object`的函数，`format`是"link"时，可以为`String`, 其他任何情况均应是一个函数。可以单独使用。|
|   `nondata`   | `Boolean` |    `false`    | 设为`true`以表示该列不显示任何数据，一般用于为用户提供一些按钮或链接以操作数据。**通常应当是最后一列。** |
|     `edit`    |  `Object` |      N/A      | 定义可编辑列的编辑规则，当前只有两个属性：`enable`: `Boolean`, 设为`true`以使该列可以编辑。 <br /> `type`: `String`, 定义要输入的数据类型，如`integer`, `decimal`等。`min`: `integer`, 设置允许输入的最小值. `max`: `integer`, 设置允许输入的最大值. |

###### 自定义列配置 ######
使用`customCol`属性添加一个自定义列以执行自定义操作，该列总是最后一列。

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|    `label`    |  `String` |      N/A      | 该列的表头，主要用于供非英语开发者为用户提供更友好的显示信息。|
|    `width`    |  `Number` |      N/A      | 该列的宽度(像素px值)，默认自动分配。|
|   `content`   | `Function, Array, Object, String` | N/A | 定义将要放入自定义列的内容。可以是`Object` , `Array`, `String` 或返回以上任一类型值的`Function`。**如果结果是`Object`或者`Object`组成的数组，则对应的`Object`应当是`jQuery Plain Object`。** |

###### HTTP请求配置 ######
`request`属性定义Igrid如何向远程服务器发送请求以获取数据。

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|  `loadonce`   | `Boolean` |    `true`     | 设为`true`表示Igrid将会一次性将所有数据从远程加载过来，分页操作在本地进行。设为`false`表示分页操作在远程完成，Igrid每次请求只会加载当前页数据(即每次翻页均会向远程数据源发送请求)。 |
|   `cache`     | `Boolean` |    `false`    | 设为`true`时, `loadonce`属性必须也为`true`, Igrid会将从服务器请求的数据缓存在本地, 供后续搜索, 可减少向服务器的请求次数并极大提高查询搜索效率. |
|   `param`     | `Object`  |    `null`     | 远程请求的参数 |
|    `sord`     | `Number`  |     `1`       | 数据列表的排序方向。正数表示正序，负数表示倒序。 |
|    `sidx`     | `String`  |  `undefined`  | 数据列表的排序字段通常应当是其中的某一列。 |
|    `url`      | `String`  |  `undefined`  | 远程请求的地址。 |
|   `mtype`     | `String`  |    `POST`     | HTTP请求的类型。当前可用值为`POST`和`GET`。 |

###### 分页配置 ######
`paginator`定义Igrid如何对数据集进行分页。

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|    `paging`   | `Boolean` |    `true`     | 指示Igrid是否进行分页 |
| `pageSizeList` | `Array`  | `[10, 20, 50]` | 可供用户选择的分页尺寸(即每页显示的行数)。一般据此提供一个下拉框供用户选择。用户的选择操作将会改变`pageSize`属性，同时会发送新的请求(远程模式下)以进行重新分页。 |
|   `pageSize`  | `Number`  |     `10`      | Igrid当前的分页尺寸，远程分页时该信息将会被发送到远程数据源。 |
|  `pageIndex`  | `Number`  |     `1`       | Igrid当前页码。远程分页是将会被发送到数据源。 |
|   `records`   | `Number`  |     `0`       | 当前请求所获取的(或本地模式下`data`属性所存储的)数据集总条数。 |
|  `pageCount`  | `Number`  |     `0`       | 分页数据集的总页数。 |

###### 事件 ######
使用`handler`属性可以为指定的事件添加自定义的处理函数。

|      事件名      |      描述    |     参数    |
|------------------|--------------|-------------|
|   `onCellClick`  | 当用户单击表格行时触发 | `ridx`: `Number`, 当前点击行的行号. <br /> `selected`: `Boolean`, 当前点击操作结果——选中本行或取消选中. |
| `onCellDblClick` | 当用户双击表格行时触发 | `ridx`: `Number`, 当前点击行行号. |
| `onLoadComplete` | 请求数据加载完毕时触发，可以在此处对Igrid进行自定义修饰 | `data`: `Array`, 加载的数据. <br /> `start`: `Number`, 当前页起始行行号. <br /> `end`: `Number`, 当前页末尾行行号. |
| `beforeCellSave`  | 用户将要保存编辑的数据时触发，一般用来进行输入数据校验 | `value`: `string/number`, 用户输入数据. <br /> `field`: `string`, 当前编辑的列名. <br /> `ridx`: `Number`, 当前编辑行行号.  |
| `afterCellSave`   | 用户输入数据保存成功后触发 | `value`: `string/number`, 用户输入数据. <br /> `field`: `string`, 当前编辑列名. <br /> `ridx`: `Number`, 当前编辑行行号. |

###### 子表格配置 ######
使用`subGrid`属性可以为每行数据定义子表格，以显示更多明细信息。主表格将会添加一列供用户点击以展开子表格.

|     属性名    |  数据类型 |     默认值    |     描述    |
|---------------|-----------|---------------|-------------|
|   `enable`    | `Boolean` |    `false`    | 指示是否启用子表格. |
|   `options`   | `Object`  |    `null`     | 定义子表格的初始化配置信息，与普通的Igrid配置基本相同，添加了`paramFn`属性用于定义如何使用主表格每行信息生成对应的子表格请求参数，可以是`Object`或者返回值为`Object`的`Function`.  |

###### 可以为`Function`的属性的参数及返回值信息  ######
|     属性名     |                          描述                     | 参数 | 返回值 |
|----------------|---------------------------------------------------|------------|--------------|
|  `formatter`   | `cols`属性中描述格式化的属性, 对应"link"类格式化. | `value`: `Object`, 当前行当前列对应单元格的数据. <br /> `row`: `Object`, 当前行数据. <br /> `ridx`: `Number`, 当前行行号. |
|  `formatter`   | `cols`属性中描述格式化的属性, 对应"img"类格式化.  | `value`: `Object`, 当前行当前列对应单元格的数据. <br /> `row`: `Object`, 当前行数据. |
|  `formatter`   | `cols`属性中描述格式化的属性, 对应其他类格式化.   | `value`: `Object`, 当前行当前列对应单元格数据. <br /> `row`: `Object`, 当前行数据. <br /> `ridx`: `Number`, 当前行行号. |
|   `paramFn`    | `subGrid`的`options`中定义子表格参数来源的属性.   | `row`: `Object`, 当前行数据. <br /> `ridx`: `Number`, 当前行行号. |

###### 方法 ######
Igrid提供了一系列方法用于读取Igrid信息或对Igrid进行操作。

|      方法名      |       描述   |    参数    |    返回值    |
|------------------|--------------|------------|--------------|
|    `getOption`   | 获取Igrid的配置信息 | `key`: `String`, 要获取的配置键名，省略时获取所有配置信息. | Igrid的配置信息. `Object` |
|     `getData`    | 获取Igrid中的数据. | N/A | Igrid存储的数据. `Array` |
| `getCurPageData` | 获取当前页的数据. | N/A | 当前页的数据. `Array` |
|       `load`     | 向Igrid中加载数据. | `data`: `Array`, 将要被加载到Igrid的数据集. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|      `reload`    | 让Igrid重新加载数据 | `obj`: `Object, Array`, 如果`obj`是`object`, 则其被视作请求参数；如果是`array`,则视作要放入Igrid的数据，直接将其赋予Igrid的`data`属性. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|      `search`    | 在表格中搜索, 当`request.cache`为`true`时, 在本地缓存中搜索, 否则向服务器请求. | `param`: `Object`, 搜索条件参数.| 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|      `update`    | 更新Igrid中保存的数据, 当`request.cache`为`true`时, 先更新缓存中的数据, 然后更新当前查询出来的数据集. 会触发`onUpdate`事件.| `factor`: `function`, 用于过滤哪些数据会被更新. `values`: `object`, 新数据.| 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|       `clear`    | 清除Igrid中的所有数据 | N/A | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `refresh`    | 刷新当前页面的数据. 会触发`onLoadComplete`事件. | N/A | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `showCol`    | 显示一列或多列. | `col`: `String, Array`, 要显示的列名. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `hideCol`    | 隐藏一列或多列. | `col`: `String, Array`, 要隐藏的列名. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|   `addRowData`   | 向Igrid添加一行 | `ridx`: `Number`, 新加行要插入的位置(行号), 省略时附加到末尾. <br /> `row`: `Object`, 要放入新行中的数据. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `addMultiRowDatas` | 向Igrid添加多行 | `ridx`: `Number`, 新加行要插入的位置(行号), 省略时附加到末尾. <br /> `rows`: `Array`, 要放入新行中的数据集. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|   `setRowData`   | 设置指定行的数据 | `ridx`: `Number`, 要设置行的行号. <br /> `data`: `Object`, 要放入指定行的数据. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|   `getRowData`   | 读取指定行的数据 | `ridx`: `Number`, 要读取行的行号. | 从指定行读取到的数据. `Object` |
|   `delRowData`   | 删除指定行 | `ridx`: `Number`, 要删除行的行号. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `getSelectedRowIdx` | 读取当前选中行的行号(单选模式). | N/A | 当前选中行的行号(索引从1开始). `Number` |
| `getSelectedRow` | 读取当前选中行的数据(单选模式). | N/A | 从当前选中行读取到的数据. `Object` |
| `setSelectedRowData` | 设置选中行数据(单选模式). | `data`: `Object`, 要被放入当前选中行的数据. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `delSelctedRow`  | 删除选中行 | N/A | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `getMultiSelectedRowIdxes` | 读取当前选中行行号(多选模式). | N/A | 当前选中行的行号数组. `Array` |
| `getMultiSelectedRows` | 读取当前选中行数据(多选模式). | N/A | 从选中行读取到的数据集. `Array` |
| `setRowSelected` | 选中指定行. | `ridx`: `Number`, 指定的行号.| 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `setRowUnselected` | 取消指定行的选中状态. | `ridx`: `Number`, 指定行行号.|当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `setCell`    | 设置指定单元格数据. | `ridx`: `Number`, 指定单元格的行号. <br /> `field`: `String`, 指定单元格的列名. `data`: `Object`, 要放入指定单元格的数据. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `getCell`    | 读取指定单元格数据. | `ridx`: `Number`, 指定单元格的行号. `field`: `String`, 指定单元格的列名. | 从单元格中读取到的数据. `Object` |
|    `saveCell`    | 保存指定单元格数据. | `ridx`: `Number`, 指定单元格的行号. <br /> `field`: `String`, 指定单元格的列名. | 当前表格的Igrid对象，用于链式操作. `Igrid Object` 如果保存失败,例如输入数据验证失败, 则会返回`false`) |
|    `editCell`    | 编辑指定单元格. | `ridx`: `Number`, 指定单元格的行号. <br /> `field`: `String`, 指定单元格的列名.| 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
| `resetSelection` | 重置Igrid的行选中状态(通常会取消所有已选中行). | N/A | 当前表格的Igrid对象，用于链式操作. `Igrid Object` |
|     `destroy`    | 销毁Igrid(将会把`<table>`元素恢复到原始状态). | N/A | N/A |
|   `storeStatus`  | 存储Igrid的当前状态(包括`pageSize`, `pageIndex`, 当前选中行行号以及远程请求参数), 使用`sessionStorage`保存，用于从此页面跳转到其他页面后，再跳转回来时恢复之前的表格状态. | N/A | N/A |
|      `valid`     | 检查grid是否合法, 任何可编辑单元格的输入错误都会使得校验失败. | N/A | grid是否检验成功（无输入错误）. `Boolean` |