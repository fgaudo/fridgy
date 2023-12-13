import 'package:functionally/reader_io.dart';
import 'package:sqlite3/wasm.dart';

import '../../application/commands/execute.dart';

typedef ExecuteParams = ({
  String query,
  List<dynamic>? params,
});

ExecuteReader<CommonDatabase, ExecuteParams> execute = (params) => ReaderIO(
      (db) => () {
        db.execute(params.query, params.params ?? []);
      },
    );
