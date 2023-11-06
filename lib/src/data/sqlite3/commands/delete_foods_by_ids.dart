import 'package:fgaudo_functional/extensions/task/bracket.dart';
import 'package:fgaudo_functional/task.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/transaction.dart';

DeleteFoodsByIds prepareDeleteFoodsByIds({
  required CommonSqlite3 sqlite3,
  required Log log,
}) =>
    (ids) => _openDatabase(sqlite3).bracket(
          release: (db) => () async => db.dispose(),
          use: transaction(
            (db) => _prepareDeletes(db).bracket(
              release: (delete) => () async => delete.dispose(),
              use: (delete) => () async {
                for (final id in ids) {
                  delete.execute([id]);
                }
              },
            ),
          ),
        );

Task<CommonPreparedStatement> _prepareDeletes(CommonDatabase db) =>
    () async => db.prepare(
          'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;',
        );

Task<CommonDatabase> _openDatabase(CommonSqlite3 sqlite3) =>
    () async => sqlite3.open(DATABASE, mode: OpenMode.readWrite);
