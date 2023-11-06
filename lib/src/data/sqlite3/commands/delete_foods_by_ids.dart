import 'package:sqlite3/sqlite3.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../../../core/common.dart';
import '../bootstrap.dart';
import '../helpers/transaction.dart';

DeleteFoodsByIds prepareDeleteFoodsByIds({
  required CommonSqlite3 sqlite3,
  required Log log,
}) =>
    (ids) => acquireResource(
          resourceTask: () async => sqlite3.open(DATABASE),
          release: (db) => () async => db.dispose(),
          use: (db) => transaction(
            database: db,
            run: (db) => acquireResource(
              resourceTask: () async => db.prepare(
                'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;',
              ),
              release: (delete) => () async => delete.dispose(),
              use: (delete) => () async {
                for (final id in ids) {
                  delete.execute([id]);
                }
              },
            ),
          ),
        );
