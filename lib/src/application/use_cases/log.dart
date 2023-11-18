import '../commands/log.dart';

typedef LogWithDeps = ({
  void Function(String) debug,
  void Function(String) info,
  void Function(String) error
});

LogWithDeps prepareLog({required LogCommandWithDeps log}) => log;
