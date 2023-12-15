import 'package:sqlite3/wasm.dart';

import '../../application/commands/execute.dart';

typedef ExecuteParams = ({
  String query,
  List<dynamic>? params,
});

ExecuteReader<CommonDatabase, ExecuteParams> execute = (params) => (db) => () {
      db.execute(params.query, params.params ?? []);
    };
