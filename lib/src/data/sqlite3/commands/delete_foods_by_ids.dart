import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';

final class DeleteFoodsByIdsDeps<LOG>
    implements HasPreparedStatementDeps<LOG>, HasTransactionDeps<LOG> {
  const DeleteFoodsByIdsDeps({
    required this.db,
    required this.logEnv,
  });

  final CommonDatabase db;

  final LOG logEnv;

  @override
  ({CommonDatabase db, LOG logEnv}) get PREPARED_STATEMENT_DEPS =>
      (db: db, logEnv: logEnv);

  @override
  ({CommonDatabase db, LOG logEnv}) get TRANSACTION_DEPS =>
      (db: db, logEnv: logEnv);
}

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

DeleteFoodsByIds<DeleteFoodsByIdsDeps<LOG>> deleteFoodsByIds<LOG>(
  Log<LOG> log,
) =>
    (ids) => transaction(
          log: log,
          run: preparedStatement(
            log: log,
            sql: deleteQuery,
            use: (ps) => Do<DeleteFoodsByIdsDeps<LOG>>()
                .map(
                  (_) => ids.map((id) => [id]),
                )
                .flatMap(
                  (ids) => (deps) => () {
                        for (final id in ids) {
                          ps.execute(id);
                          log(
                            LogType.info,
                            'SQL: "$deleteQuery" with $id',
                          )(
                            deps.logEnv,
                          );
                        }
                      },
                ),
          ),
        );
