@JS()
library callable_function;

import 'package:flutter/material.dart';
import 'package:js/js.dart';
import 'package:logging/logging.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/generic/commands/log.dart';
import 'src/data/sqlite3/bootstrap.dart';
import 'src/data/sqlite3/commands/delete_foods_by_ids.dart';
import 'src/data/sqlite3/interop.dart';
import 'src/data/sqlite3/streams/foods.dart';
import 'src/presentation/flutter/app.dart';

@JS('populateDB')
external set _populateDB(void Function() f);

@JS('clearDB')
external set _clearDB(void Function() f);

@JS('execute')
external set _execute(void Function(String, List<dynamic>?) f);

@JS('select')
external set _select(
  List<dynamic> Function(String, List<dynamic>?) f,
);

void main() async {
  final appLogger = Logger('APP');
  final dataLogger = Logger('DATA');
  final presentationLogger = Logger('UI');

  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  final (
    read: readDB,
    write: readWriteDB,
  ) = await loadDB(
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  createTables(readWriteDB);

  _populateDB = allowInterop(
    populateDB(readWriteDB),
  );

  _clearDB = allowInterop(
    clearDB(readWriteDB),
  );

  _execute = allowInterop(
    execute(readWriteDB),
  );

  _select = allowInterop(
    select(readDB),
  );

  runApp(
    MyApp(
      log: (type, message) => log(type, message)(presentationLogger),
      overviewPipeIO: overview.preparePipeIO(
        log: log,
        foods$: foods$,
        deleteByIds: deleteFoodsByIds,
      )(
        (
          logEnv: appLogger,
          deleteByIdsEnv: (
            dbEnv: readWriteDB,
            loggerEnv: dataLogger,
          ),
          foodsEnv: (
            dbEnv: readWriteDB,
            logEnv: log,
            loggerEnv: dataLogger,
          ),
        ),
      ),
    ),
  );
}
