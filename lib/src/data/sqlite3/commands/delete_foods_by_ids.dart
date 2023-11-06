import 'package:fgaudo_functional/extensions/task/bracket.dart';
import 'package:fgaudo_functional/task.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/transaction.dart';

DeleteFoodsByIds prepareDeleteFoodsByIds({
  required CommonDatabase database,
  required Log log,
}) =>
    (ids) => transaction(
          (db) => _prepareDeletes(db).bracket(
            release: (delete) => () async => delete.dispose(),
            use: (delete) => () async {
              for (final id in ids) {
                delete.execute([id]);
              }
            },
          ),
        )(database);

Task<CommonPreparedStatement> _prepareDeletes(CommonDatabase db) =>
    () async => db.prepare(
          'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;',
        );
