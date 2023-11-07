import 'package:flutter/material.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import 'src/application/use_cases/overview.dart' as overview;
import 'src/data/generic/commands/log.dart';
import 'src/data/sqlite3/bootstrap.dart';
import 'src/data/sqlite3/commands/delete_foods_by_ids.dart';
import 'src/data/sqlite3/streams/foods.dart';
import 'src/presentation/flutter/app.dart';

void main() async {
  final sqlite3 = await bootstrap(
    pathToWasm: 'sqlite3.wasm',
    dbName: 'fridgy',
  );

  final appLogger = Logger('APP');
  final dataLogger = Logger('DATA');
  final presentationLogger = Logger('UI');
  final domain = Logger('DOMAIN');

  final appLog = prepareLog(appLogger);
  final dataLog = prepareLog(dataLogger);
  final presentationLog = prepareLog(presentationLogger);

  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    print(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  final database = sqlite3.open(DATABASE, mode: OpenMode.readWrite);
  final readonlyDatabase = sqlite3.open(DATABASE, mode: OpenMode.readOnly);

  runApp(
    MyApp(
      log: presentationLog,
      overviewPipeIO: overview.preparePipeIO(
        pending$: Stream.value(0).asBroadcastStream(),
        log: appLog,
        foods$: prepareFoodsStream(
          database: readonlyDatabase,
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
