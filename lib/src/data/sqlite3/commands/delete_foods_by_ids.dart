import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/wasm.dart';

import '../../../application/commands/delete_foods_by_ids.dart';
import '../../../application/commands/log.dart';
import '../../generic/commands/log.dart';
import '../bootstrap.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';

final class DeleteFoodsByIdsDeps
    implements HasTransactionDeps, HasPreparedStatementDeps {
  const DeleteFoodsByIdsDeps({
    required this.db,
    required this.logger,
  });

  final CommonDatabase db;

  final Logger logger;

  @override
  ({CommonDatabase db, PreparedLog log}) get PREPARED_STATEMENT_DEPS =>
      (db: db, log: (string) => log(LogType.info, string)(logger));

  @override
  ({CommonDatabase db, TransactionLog log}) get TRANSACTION_DEPS =>
      (db: db, log: (string) => log(LogType.info, string)(logger));
}

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

final DeleteFoodsByIds<DeleteFoodsByIdsDeps> deleteFoodsByIds =
    (ids) => transaction(
          preparedStatement(
            sql: deleteQuery,
            use: (ps) => Do<DeleteFoodsByIdsDeps>()
                .map(
                  (_) => ids.map((id) => [id]),
                )
                .flatMap(
                  (ids) => (deps) => () {
                        for (final id in ids) {
                          ps.execute(id);
                          log(LogType.info, 'SQL: "$deleteQuery" with $id')(
                            deps.logger,
                          );
                        }
                      },
                ),
          ),
        );
