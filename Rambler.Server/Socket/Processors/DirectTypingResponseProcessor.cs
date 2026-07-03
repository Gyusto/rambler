namespace Rambler.Server.Socket.Processors
{
    using Contracts.Responses;
    using Socket;
    using System.Threading.Tasks;

    public class DirectTypingResponseProcessor : IResponseProcesor<DirectTypingResponse>
    {
        private readonly SocketSubscriptions subs;

        public DirectTypingResponseProcessor(SocketSubscriptions subs)
        {
            this.subs = subs;
        }

        public async Task Process(Response<DirectTypingResponse> response)
        {
            await subs.Publish(response);
        }
    }
}
