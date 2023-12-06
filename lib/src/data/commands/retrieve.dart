import 'package:functionally/reader_io.dart';
import 'package:js/js_util.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/retrieve.dart';

RetrieveReader<CommonDatabase> retrieve = (sql, values) => ReaderIO(
      (db) => () => db.select(sql, values ?? []).map((row) {
            final Object object = newObject();
            row.forEach((k, v) {
              setProperty(object, k, v);
            });
            return object;
          }).toList(),
    );
