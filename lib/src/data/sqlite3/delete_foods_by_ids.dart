import 'package:sqlite3/sqlite3.dart';

import '../../application/commands/delete_foods_by_ids.dart';
import '../../application/commands/log.dart';
import 'bootstrap.dart';
import 'helpers/acquire.dart';

DeleteFoodsByIds prepareDeleteFoodsByIds(
  CommonSqlite3 sqlite3,
  Log log,
) =>
    (ids) => () => acquireDb(
          log,
          sqlite3.open(DATABASE),
          (db) {
            final resultSet = db.select(
              'SELECT * FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?',
              ['ciao'],
            );

            for (final row in resultSet) {
              log(
                LogType.info,
                'Food[name: ${row[FOODS_TABLE_NAME]}}]',
              );
            }
          },
        );
