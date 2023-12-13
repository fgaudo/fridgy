import 'package:functionally/reader_io.dart';
import 'package:js/js_util.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/retrieve.dart';

typedef RetrieveParams = ({
  String query,
  List<dynamic>? params,
});

RetrieveReader<CommonDatabase, RetrieveParams> retrieve = (params) => ReaderIO(
      (db) => () => db.select(params.query, params.params ?? []).map((row) {
            final Object object = newObject();
            row.forEach((k, v) {
              setProperty(object, k, v);
            });
            return object;
          }).toList(),
    );
