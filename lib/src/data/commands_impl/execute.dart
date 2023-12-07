import 'package:functionally/reader_io.dart';
import 'package:sqlite3/wasm.dart';

import '../commands/execute.dart';

ExecuteReader<CommonDatabase> execute = (sql, values) => ReaderIO(
      (db) => () {
        db.execute(sql, values ?? []);
      },
    );
