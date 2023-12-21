import 'package:functionally/common.dart';
import 'package:functionally/reader_io.dart' as RIO;

import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/delete_foods_by_ids.dart';
import '../../application/commands/log.dart';
import '../helpers/prepared_statement.dart';
import '../helpers/transaction.dart';
import '../schema.dart';
import 'log.dart';

typedef DeleteFoodsByIdsDeps = ({CommonDatabase db, Logger logEnv});

const String deleteQuery =
    'DELETE FROM $FOODS_TABLE WHERE $FOODS_TABLE_NAME = ?;';

DeleteFoodsByIdsReader<DeleteFoodsByIdsDeps> prepareDeleteFoodsByIds = (ids) =>
    transaction(
      Builder(
        preparedStatement(
          sql: deleteQuery,
          run: (preparedStatement) => Builder(RIO.make<DeleteFoodsByIdsDeps>())
              .transform(
                RIO.map(
                  (_) => ids.map((id) => [id]),
                ),
              )
              .transform(
                RIO.flatMap(
                  (ids) => RIO.sequenceArray(
                    ids.map(
                      (id) => Builder(RIO.make<DeleteFoodsByIdsDeps>())
                          .transform(
                            RIO.apFirst_(
                              (_) => () => preparedStatement.execute(id),
                            ),
                          )
                          .transform(
                            RIO.apFirst_(
                              _info(
                                'SQL: "$deleteQuery" with $id',
                              ),
                            ),
                          )
                          .build(),
                    ),
                  ),
                ),
              )
              .build(),
        ),
      )
          .transform(
            RIO.local(
              _toPreparedStatementDeps,
            ),
          )
          .build(),
    )
        .local(
          _toTransactionDeps,
        )
        .toReaderTask()
        .build();

RIO.ReaderIO<DeleteFoodsByIdsDeps, void> _info(String message) =>
    (deps) => log(LogType.info, message)(deps.logEnv);

TransactionDeps<DeleteFoodsByIdsDeps> _toTransactionDeps(
  DeleteFoodsByIdsDeps deps,
) =>
    (
      env: deps,
      logEnv: deps.logEnv,
      db: deps.db,
    );

PreparedStatementDeps<DeleteFoodsByIdsDeps> _toPreparedStatementDeps(
  DeleteFoodsByIdsDeps deps,
) =>
    (
      env: deps,
      logEnv: deps.logEnv,
      db: deps.db,
    );
