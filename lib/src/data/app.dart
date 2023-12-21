import 'package:flutter/foundation.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/sqlite3.dart';

import '../application/app.dart';
import 'commands_impl/delete_foods_by_ids.dart';
import 'commands_impl/foods.dart';
import 'commands_impl/log.dart';
import 'schema.dart';

const String _DATABASE = 'fridgy';
const String _APP_LOGGER_NAME = 'APP';
const String _UI_LOGGER_NAME = 'UI';
const String _DATA_LOGGER_NAME = 'DATA';

final class AppImpl extends App {
  AppImpl({
    required super.appLog,
    required super.deleteFoodsByIds,
    required super.foods,
    required super.uiLog,
  });
}

Future<AppImpl> createApp({
  required bool debugMode,
}) async {
  final logLevel = debugMode ? Level.ALL : Level.INFO;

  final appLogger = Logger(_APP_LOGGER_NAME);
  final dataLogger = Logger(_DATA_LOGGER_NAME);
  final uiLogger = Logger(_UI_LOGGER_NAME);

  Logger.root.level = logLevel;
  Logger.root.onRecord.listen((record) {
    debugPrint(
      '${record.level.name} [${record.loggerName}] : ${record.message}',
    );
  });

  final readWriteDB = sqlite3.open(_DATABASE, mode: OpenMode.readWriteCreate);
  final _ = sqlite3.open(_DATABASE, mode: OpenMode.readOnly);

  initTables(readWriteDB);

  return AppImpl(
    deleteFoodsByIds: (ids) => prepareDeleteFoodsByIds(ids)(
      (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
    ),
    foods: prepareFoods(
      (
        db: readWriteDB,
        logEnv: dataLogger,
      ),
    ),
    appLog: (type, message) => log(type, message)(appLogger),
    uiLog: (type, message) => log(type, message)(uiLogger),
  );
}
