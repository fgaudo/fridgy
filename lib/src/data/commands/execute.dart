import 'package:functionally/reader_io.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/execute.dart';

ExecuteReader<CommonDatabase> execute = (sql, values) => ReaderIO(
      (db) => () {
        db.execute(sql, values ?? []);
      },
    );
