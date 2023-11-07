@JS()
library callable_function;

import 'package:flutter/material.dart';
import 'package:js/js.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/generic/commands/log.dart';
import 'src/data/sqlite3/bootstrap.dart';
import 'src/data/sqlite3/commands/delete_foods_by_ids.dart';
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
  final appLog = prepareLog(Logger('APP'));
  final dataLog = prepareLog(Logger('DATA'));
  final presentationLog = prepareLog(Logger('UI'));

  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  final sqlite3 = await bootstrap(
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  final database = sqlite3.open(DATABASE, mode: OpenMode.readWrite);

  _populateDB = allowInterop(
    populateDB(database),
  );

  _clearDB = allowInterop(
    clearDB(database),
  );

  _execute = allowInterop(
    execute(database),
  );

  _select = allowInterop(
    select(database),
  );

  runApp(
    MyApp(
      log: presentationLog,
      overviewPipeIO: overview.preparePipeIO(
        pending$: Stream.value(0).asBroadcastStream(),
        log: appLog,
        foods$: prepareFoodsStream(
          database: database,
          log: dataLog,
        ),
        deleteByIds: prepareDeleteFoodsByIds(
          database: database,
          log: dataLog,
        ),
      ),
    ),
  );
}
