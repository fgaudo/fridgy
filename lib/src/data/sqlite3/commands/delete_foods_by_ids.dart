import 'package:fgaudo_functional/extensions/io/bracket.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/transaction.dart';

final DeleteFoodsByIds<({CommonDatabase db, Logger logger, Log<Logger> log})>
    deleteFoodsByIds = (ids) => (env) => transaction(
          (db) => _prepareDeletes(env.db).bracket(
            release: (delete) => () => delete.dispose(),
            use: (delete) => () {
              for (final id in ids) {
                delete.execute([id]);
              }
            },
          ),
        )(env.db);

IO<CommonPreparedStatement> _prepareDeletes(CommonDatabase db) =>
    () => db.prepare(
          'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;',
        );
